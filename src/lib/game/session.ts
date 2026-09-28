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
import { gameReducer, initialGameState } from "./gameState";
import { JUTSU } from "./jutsu";
import { isComboMilestone } from "./combo";
import { Sfx } from "@/lib/audio/sfx";
import { CorrectionStabilizer, MIN_PALM_SIZE } from "@/lib/vision/correctionEngine";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import type { GestureRecognizer } from "@/lib/vision/gestureRecognizer";

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
  nextRound: 1300,
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
        this.sfx.fail();
        break;
      case "VICTORY":
        this.schedule(250, () => this.sfx.victory());
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
        const message =
          hands.length === 0
            ? "Place both hands inside the frame."
            : hands.length === 1
              ? "Show both hands."
              : "Move closer to the camera.";
        this.setFeedback({ tone: "hint", title: "CAMERA CHECK", message, key: `cal:${message}` });
      }
    } else if (s.phase === "PLAYING" && s.jutsuId) {
      expected = this.handlePlaying(frame, t);
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

    if (t < this.errorUntil && this.errorSign) {
      this.setFeedback({
        tone: "error",
        title: `INCORRECT — THAT'S ${SIGNS[this.errorSign].name.toUpperCase()}`,
        message: corr?.message ?? `${exp.name}: ${exp.howTo}.`,
        key: `err:${this.errorSign}:${corr?.key ?? ""}`,
      });
      this.overlay.tone = "error";
      this.overlay.highlight = corr?.highlight ?? null;
    } else if (frame.hold?.sign === expected) {
      this.setFeedback(null);
      this.overlay.tone = "good";
      this.overlay.highlight = null;
    } else if (corr && (t - this.lastProgressAt > TIMING.hintDelay || corr.kind === "hands")) {
      this.setFeedback({ tone: "hint", title: "ADJUST", message: corr.message, key: `hint:${corr.key}` });
      this.overlay.tone = "hint";
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
