/**
 * GameSession — glue between the vision pipeline and the game state machine.
 *
 * Lives OUTSIDE React: it receives every camera frame (~30/s), decides what the
 * frame means for the game (correct seal, wrong seal, what to correct), owns all
 * timers and sounds, and exposes two tiny external stores:
 *   - game state  (changes a few times per round)   → useSyncExternalStore
 *   - live HUD    (throttled to ~12 updates/s)       → useSyncExternalStore
 * The camera overlay reads `overlay` directly every frame without React.
 */
import type { GameAction, GameState, Phase } from "@/types/game";
import type { Correction, RecognitionFrame, SignId } from "@/types/gestures";
import { TRAIN_MASTERY, gameReducer, initialGameState } from "./gameState";
import { rankFor } from "./scoring";
import { JUTSU } from "./jutsu";
import { isComboMilestone } from "./combo";
import { Sfx } from "@/lib/audio/sfx";
import { MusicPlayer } from "@/lib/audio/music";
import { CorrectionStabilizer, MIN_PALM_SIZE } from "@/lib/vision/correctionEngine";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import type { GestureRecognizer } from "@/lib/vision/gestureRecognizer";
import { getLang, t as tt, tr } from "@/lib/i18n";
import { CHAPTERS } from "./story";

const LS_PROGRESS = "shinobi.progress";
const LS_RECORDS = "shinobi.records";
const LS_DOJO = "shinobi.dojo";

export interface RecordEntry {
  score: number;
  rank: string;
}

/** Outcome of the fight that just ended, compared with the stored record. */
export interface RecordResult {
  key: string;
  best: RecordEntry | null;
  isNew: boolean;
}

export type FeedbackTone = "hint" | "error";

export interface Feedback {
  tone: FeedbackTone;
  title: string;
  message: string;
  key: string;
}

export interface LiveHud {
  hands: number;
  detected: SignId | null;
  confidence: number;
  hold: { sign: SignId; progress: number } | null;
  expected: SignId | null;
  feedback: Feedback | null;
  /** 0..1 progress of the camera check. */
  calibration: number;
  fps: number;
}

export interface OverlayState {
  tone: "idle" | "good" | "hint" | "error";
  highlight: Correction["highlight"] | null;
}

/** Timings (ms). */
export const TIMING = {
  calibrationHold: 1200,
  readyToSelection: 1600,
  countdownStep: 750,
  successCharge: 950,
  castImpact: 650,
  castDuration: 2400,
  nextRound: 2300,
  /** Extra time a wrong seal must be held (after recognition) before it counts as a mistake. */
  wrongHold: 350,
  /** How long a counted mistake stays on screen. */
  errorShow: 1900,
  /** Idle time on a step before correction hints appear. */
  hintDelay: 1100,
};

const EMPTY_LIVE: LiveHud = { hands: 0, detected: null, confidence: 0, hold: null, expected: null, feedback: null, calibration: 0, fps: 0 };

export class GameSession {
  readonly sfx = new Sfx();
  readonly music = new MusicPlayer();
  readonly overlay: OverlayState = { tone: "idle", highlight: null };

  private state: GameState = initialGameState();
  private live: LiveHud = EMPTY_LIVE;
  private stateSubs = new Set<() => void>();
  private liveSubs = new Set<() => void>();
  private phaseTimers: ReturnType<typeof setTimeout>[] = [];
  private tickHandle: ReturnType<typeof setInterval> | null = null;
  private lastTick = 0;
  private lastLiveEmit = 0;

  private stabilizer = new CorrectionStabilizer();
  private twoHandsSince: number | null = null;
  private lastProgressAt = 0;
  private wrong: { sign: SignId; since: number; counted: boolean } | null = null;
  private errorUntil = 0;
  private errorSign: SignId | null = null;
  private recognizer: GestureRecognizer | null = null;

  // --- external stores -----------------------------------------------------
  getState = () => this.state;
  subscribe = (fn: () => void) => {
    this.stateSubs.add(fn);
    return () => this.stateSubs.delete(fn);
  };
  getLive = () => this.live;
  subscribeLive = (fn: () => void) => {
    this.liveSubs.add(fn);
    return () => this.liveSubs.delete(fn);
  };

  // --- story progress (chapters cleared), persisted per browser ------------
  private progress = 0;
  private progressSubs = new Set<() => void>();
  getProgress = () => this.progress;
  subscribeProgress = (fn: () => void) => {
    this.progressSubs.add(fn);
    return () => this.progressSubs.delete(fn);
  };
  loadProgress() {
    try {
      const n = Number(localStorage.getItem(LS_PROGRESS) ?? 0);
      this.progress = Number.isFinite(n) ? Math.max(0, Math.min(CHAPTERS.length, n)) : 0;
    } catch {
      this.progress = 0;
    }
    this.progressSubs.forEach((f) => f());
  }
  saveProgress(cleared: number) {
    this.progress = Math.max(this.progress, Math.min(CHAPTERS.length, cleared));
    try {
      localStorage.setItem(LS_PROGRESS, String(this.progress));
    } catch {
      /* storage unavailable */
    }
    this.progressSubs.forEach((f) => f());
  }
  resetProgress() {
    this.progress = 0;
    try {
      localStorage.removeItem(LS_PROGRESS);
    } catch {
      /* ignore */
    }
    this.progressSubs.forEach((f) => f());
  }

  // --- personal records (best score per battle), persisted per browser -------
  private records: Record<string, RecordEntry> = {};
  lastRecord: RecordResult | null = null;
  getRecords = () => this.records;
  loadRecords() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_RECORDS) ?? "{}");
      this.records = raw && typeof raw === "object" ? raw : {};
    } catch {
      this.records = {};
    }
  }
  private recordKey(s: GameState) {
    return s.mode === "story" && s.chapter != null ? `story:${s.chapter}` : "quick";
  }
  private commitRecord(s: GameState): RecordResult {
    const key = this.recordKey(s);
    const prev = this.records[key] ?? null;
    const entry = { score: s.stats.score, rank: rankFor(s.stats) };
    const isNew = !prev || entry.score > prev.score;
    if (isNew) {
      this.records = { ...this.records, [key]: entry };
      try {
        localStorage.setItem(LS_RECORDS, JSON.stringify(this.records));
      } catch {
        /* storage unavailable */
      }
    }
    return { key, best: prev, isNew };
  }

  // --- dojo mastery ---------------------------------------------------------
  private dojoMastered: SignId[] = [];
  getDojoMastered = () => this.dojoMastered;
  private loadDojo() {
    try {
      const v = JSON.parse(localStorage.getItem(LS_DOJO) ?? "[]");
      this.dojoMastered = Array.isArray(v) ? v.filter((x): x is SignId => typeof x === "string" && x in SIGNS) : [];
    } catch {
      this.dojoMastered = [];
    }
  }
  private saveDojo(list: SignId[]) {
    this.dojoMastered = Array.from(new Set([...this.dojoMastered, ...list]));
    try {
      localStorage.setItem(LS_DOJO, JSON.stringify(this.dojoMastered));
    } catch {
      /* storage unavailable */
    }
  }

  attachRecognizer(r: GestureRecognizer) {
    this.recognizer = r;
  }

  // --- state machine -------------------------------------------------------
  dispatch = (a: GameAction) => {
    const prev = this.state;
    const next = gameReducer(prev, a);
    if (next === prev) return;
    this.state = next;

    if (a.type === "SIGN" && next.seqIndex !== prev.seqIndex) {
      this.sfx.confirm(prev.seqIndex);
      if (isComboMilestone(next.stats.combo)) setTimeout(() => this.sfx.combo(), 140);
    }
    if (a.type === "MISTAKE") this.sfx.error();
    if (a.type === "COUNTDOWN_TICK" && next.phase === "COUNTDOWN") this.sfx.tick();
    if (a.type === "TRAIN_HIT" && next.training) {
      const tr0 = next.training;
      const justMastered = tr0.streak === TRAIN_MASTERY;
      if (justMastered) {
        this.sfx.mastered();
        this.saveDojo(tr0.mastered);
        // Auto-advance to the next seal the player hasn't mastered yet.
        const order = Object.keys(SIGNS) as SignId[];
        const start = order.indexOf(tr0.sign);
        const nextSign =
          order.slice(start + 1).concat(order.slice(0, start)).find((x) => !tr0.mastered.includes(x) && !this.dojoMastered.includes(x)) ??
          order[(start + 1) % order.length];
        this.schedule(1100, () => {
          if (this.state.phase === "TRAINING") this.dispatch({ type: "TRAIN_SELECT", sign: nextSign });
        });
      } else this.sfx.confirm(tr0.streak - 1);
    }
    if (a.type === "SELECT_SLOT") {
      this.sfx.select();
      this.recognizer?.reset();
      this.stabilizer.reset();
      this.wrong = null;
      this.lastProgressAt = performance.now();
    }
    if (a.type === "CAST_DONE" && next.lastRound) {
      if (next.lastRound.retaliation > 0) setTimeout(() => this.sfx.enemyStrike(), 250);
      if (next.lastRound.burn || next.lastRound.summon) this.sfx.hit();
    }
    if (a.type === "TRAIN_SELECT") {
      this.recognizer?.reset();
      this.stabilizer.reset();
      this.lastProgressAt = performance.now();
    }

    if (next.phase !== prev.phase) this.enterPhase(next.phase, prev.phase);
    this.stateSubs.forEach((f) => f());
  };

  private schedule(ms: number, fn: () => void) {
    this.phaseTimers.push(setTimeout(fn, ms));
  }

  private enterPhase(phase: Phase, prev: Phase) {
    this.phaseTimers.forEach(clearTimeout);
    this.phaseTimers = [];
    if (prev === "PLAYING") this.stopTicking();
    this.setFeedback(null);
    this.overlay.tone = "idle";
    this.overlay.highlight = null;

    switch (phase) {
      case "CAMERA_CHECK":
        this.twoHandsSince = null;
        break;
      case "READY":
        this.sfx.detected();
        this.schedule(TIMING.readyToSelection, () => this.dispatch({ type: "ENTER_SELECTION" }));
        break;
      case "COUNTDOWN": {
        this.sfx.tick();
        this.sfx.signs();
        const step = () =>
          this.schedule(TIMING.countdownStep, () => {
            this.dispatch({ type: "COUNTDOWN_TICK" });
            if (this.state.phase === "COUNTDOWN") step();
          });
        step();
        break;
      }
      case "PLAYING":
        this.sfx.go();
        this.recognizer?.reset();
        this.stabilizer.reset();
        this.wrong = null;
        this.errorUntil = 0;
        this.lastProgressAt = performance.now();
        this.startTicking();
        break;
      case "SUCCESS":
        this.sfx.charge();
        this.schedule(TIMING.successCharge, () => this.dispatch({ type: "SUCCESS_DONE" }));
        break;
      case "JUTSU_CAST": {
        const el = JUTSU[this.state.jutsuId!].element;
        this.sfx.attack(el);
        this.schedule(TIMING.castImpact, () => this.sfx.hit());
        this.schedule(TIMING.castDuration, () => this.dispatch({ type: "CAST_DONE" }));
        break;
      }
      case "NEXT_ROUND":
        this.schedule(TIMING.nextRound, () => this.dispatch({ type: "NEXT_ROUND_DONE" }));
        break;
      case "FAILED":
        this.sfx.enemyStrike();
        this.schedule(450, () => this.sfx.fail());
        break;
      case "DEFEAT":
        this.sfx.enemyStrike();
        this.schedule(500, () => this.sfx.defeat());
        break;
      case "TRAINING":
        this.loadDojo();
        this.recognizer?.reset();
        this.stabilizer.reset();
        this.lastProgressAt = performance.now();
        break;
      case "VICTORY":
        this.lastRecord = this.commitRecord(this.state);
        this.schedule(250, () => this.sfx.victory());
        if (this.state.mode === "story" && this.state.chapter != null) this.saveProgress(this.state.chapter + 1);
        break;
    }
  }

  private startTicking() {
    this.stopTicking();
    this.lastTick = performance.now();
    this.tickHandle = setInterval(() => {
      const now = performance.now();
      const dt = now - this.lastTick;
      this.lastTick = now;
      this.dispatch({ type: "TICK", dt });
    }, 100);
  }

  private stopTicking() {
    if (this.tickHandle) clearInterval(this.tickHandle);
    this.tickHandle = null;
  }

  // --- per-frame logic -----------------------------------------------------
  onFrame(frame: RecognitionFrame) {
    const t = frame.features.t;
    const s = this.state;
    const hands = frame.features.hands;
    let calibration = this.live.calibration;
    let expected: SignId | null = null;

    if (s.phase === "CAMERA_CHECK") {
      const okSize = hands.length === 2 && hands.every((h) => h.size >= MIN_PALM_SIZE);
      if (okSize) {
        if (this.twoHandsSince == null) this.twoHandsSince = t;
        calibration = Math.min(1, (t - this.twoHandsSince) / TIMING.calibrationHold);
        this.setFeedback(null);
        if (calibration >= 1) this.dispatch({ type: "CAMERA_READY" });
      } else {
        this.twoHandsSince = null;
        calibration = 0;
        const message = tt(hands.length === 0 ? "placeHands" : hands.length === 1 ? "showBoth" : "moveCloser");
        this.setFeedback({ tone: "hint", title: tt("cameraCheck"), message, key: `cal:${message}` });
      }
    } else if (s.phase === "PLAYING" && s.jutsuId) {
      expected = this.handlePlaying(frame, t);
    } else if (s.phase === "TRAINING" && s.training) {
      expected = this.handleTraining(frame, t);
    }

    const detected = frame.hold?.sign ?? null;
    const conf = detected ? (frame.scores.find((x) => x.sign === detected)?.confidence ?? 0) : (frame.scores[0]?.confidence ?? 0);
    this.updateLive(
      {
        hands: hands.length,
        detected,
        confidence: conf,
        hold: frame.hold,
        expected,
        calibration,
        fps: frame.fps,
      },
      t,
    );
  }

  private handlePlaying(frame: RecognitionFrame, t: number): SignId {
    const s = this.state;
    const seq = JUTSU[s.jutsuId!].sequence;
    const expected = seq[s.seqIndex];
    const prevSign = s.seqIndex > 0 ? seq[s.seqIndex - 1] : null;

    if (frame.accepted === expected) {
      this.lastProgressAt = t;
      this.errorUntil = 0;
      this.wrong = null;
      this.stabilizer.reset();
      this.setFeedback(null);
      this.overlay.tone = "good";
      this.overlay.highlight = null;
      this.dispatch({ type: "SIGN", sign: expected });
      return this.state.phase === "PLAYING" ? seq[this.state.seqIndex] : expected;
    }

    // Wrong seal held → counted mistake (once per distinct attempt).
    const held = frame.hold && frame.hold.progress >= 1 ? frame.hold.sign : null;
    const wrongSign = held && held !== expected && held !== prevSign ? held : null;
    let justFailed = false;
    if (wrongSign) {
      if (!this.wrong || this.wrong.sign !== wrongSign) this.wrong = { sign: wrongSign, since: t, counted: false };
      if (!this.wrong.counted && t - this.wrong.since >= TIMING.wrongHold) {
        this.wrong.counted = true;
        this.errorUntil = t + TIMING.errorShow;
        this.errorSign = wrongSign;
        justFailed = true;
        this.dispatch({ type: "MISTAKE", sign: wrongSign });
      }
    } else {
      this.wrong = null;
    }

    const raw = this.recognizer?.getCorrection(expected, frame.features) ?? null;
    const corr = justFailed ? this.stabilizer.force(raw, t) : this.stabilizer.update(raw, t);
    const exp = SIGNS[expected];
    const lang = getLang();

    if (t < this.errorUntil && this.errorSign) {
      this.setFeedback({
        tone: "error",
        title: tt("incorrect", { sign: tr(SIGNS[this.errorSign].name).toUpperCase() }),
        message: corr ? tr(corr.text) : `${tr(exp.name)}: ${tr(exp.howTo)}.`,
        key: `err:${lang}:${this.errorSign}:${corr?.key ?? ""}`,
      });
      this.overlay.tone = "error";
      this.overlay.highlight = corr?.highlight ?? null;
    } else if (frame.hold?.sign === expected) {
      this.setFeedback(null);
      this.overlay.tone = "good";
      this.overlay.highlight = null;
    } else if (corr && (t - this.lastProgressAt > TIMING.hintDelay || corr.kind === "hands")) {
      this.setFeedback({ tone: "hint", title: tt("adjust"), message: tr(corr.text), key: `hint:${lang}:${corr.key}` });
      this.overlay.tone = "hint";
      this.overlay.highlight = corr.highlight ?? null;
    } else {
      this.setFeedback(null);
      this.overlay.tone = "idle";
      this.overlay.highlight = null;
    }
    return expected;
  }

  /** Dojo: no timer, no mistakes — just the target seal and live coaching. */
  private handleTraining(frame: RecognitionFrame, t: number): SignId {
    const expected = this.state.training!.sign;
    if (frame.accepted === expected) {
      this.lastProgressAt = t;
      this.stabilizer.reset();
      this.setFeedback(null);
      this.overlay.tone = "good";
      this.overlay.highlight = null;
      this.dispatch({ type: "TRAIN_HIT" });
      return expected;
    }
    const raw = this.recognizer?.getCorrection(expected, frame.features) ?? null;
    const corr = this.stabilizer.update(raw, t);
    const lang = getLang();
    if (frame.hold?.sign === expected) {
      this.setFeedback(null);
      this.overlay.tone = "good";
      this.overlay.highlight = null;
    } else if (corr && (t - this.lastProgressAt > 700 || corr.kind === "hands")) {
      const wrong = frame.hold && frame.hold.progress >= 1 ? frame.hold.sign : null;
      this.setFeedback({
        tone: wrong ? "error" : "hint",
        title: wrong ? tt("incorrect", { sign: tr(SIGNS[wrong].name).toUpperCase() }) : tt("adjust"),
        message: tr(corr.text),
        key: `dojo:${lang}:${wrong ?? ""}:${corr.key}`,
      });
      this.overlay.tone = wrong ? "error" : "hint";
      this.overlay.highlight = corr.highlight ?? null;
    } else {
      this.setFeedback(null);
      this.overlay.tone = "idle";
      this.overlay.highlight = null;
    }
    return expected;
  }

  private setFeedback(f: Feedback | null) {
    if ((f?.key ?? null) === (this.live.feedback?.key ?? null)) return;
    this.live = { ...this.live, feedback: f };
    this.liveSubs.forEach((fn) => fn());
  }

  private updateLive(p: Omit<LiveHud, "feedback">, t: number) {
    const l = this.live;
    const discrete =
      p.hands !== l.hands ||
      p.detected !== l.detected ||
      p.expected !== l.expected ||
      (p.hold?.sign ?? null) !== (l.hold?.sign ?? null) ||
      (p.calibration >= 1) !== (l.calibration >= 1);
    if (!discrete && t - this.lastLiveEmit < 80) return;
    this.lastLiveEmit = t;
    this.live = { ...p, feedback: l.feedback };
    this.liveSubs.forEach((fn) => fn());
  }

  destroy() {
    this.phaseTimers.forEach(clearTimeout);
    this.stopTicking();
    this.stateSubs.clear();
    this.liveSubs.clear();
  }
}
