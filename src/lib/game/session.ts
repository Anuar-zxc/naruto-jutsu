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
import { JUTSU, impactMs } from "./jutsu";
import { isComboMilestone } from "./combo";
import { Sfx } from "@/lib/audio/sfx";
import { MusicPlayer } from "@/lib/audio/music";
import { CorrectionStabilizer, MIN_PALM_SIZE } from "@/lib/vision/correctionEngine";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import type { GestureRecognizer } from "@/lib/vision/gestureRecognizer";
import { getLang, t as tt, tr } from "@/lib/i18n";
import { CHAPTERS } from "./story";
import { DOJO_REWARD, withStarter, buy, defaultProfile, randomNick, reward, sanitizeProfile, cleanNick, type Profile, type UpgradeId } from "./profile";
import { hostLocal, hostPeer, joinLocal, joinPeer, newRoomCode, normalizeCode, type NetError, type NetMessage, type Transport } from "@/lib/net/transport";
import type { CharacterId } from "./characters";
import { CHARACTERS } from "./characters";

const LS_PROFILE = "shinobi.profile";

/** Online-duel connection state shown by the lobby. */
export interface DuelUi {
  status: "idle" | "hosting" | "joining" | "connected" | "error";
  code: string;
  error: NetError | "left" | null;
  opponent: { nick: string; hero: CharacterId } | null;
  opponentReady: boolean;
  role: "host" | "guest" | null;
  /** The opponent disconnected mid-fight (win by forfeit). */
  forfeit: boolean;
}
const IDLE_DUEL: DuelUi = { status: "idle", code: "", error: null, opponent: null, opponentReady: false, role: null, forfeit: false };

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
  castDuration: 2600,
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
    if (s.mode === "duel") return "duel";
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

  // --- profile: nickname, ryō, upgrades ---------------------------------------
  private profile: Profile = defaultProfile();
  private profileSubs = new Set<() => void>();
  /** Ryō earned by the fight that just ended (for the result screen). */
  lastReward: number | null = null;
  getProfile = () => this.profile;
  subscribeProfile = (fn: () => void) => {
    this.profileSubs.add(fn);
    return () => this.profileSubs.delete(fn);
  };
  loadProfile() {
    let p = defaultProfile();
    try {
      p = sanitizeProfile(JSON.parse(localStorage.getItem(LS_PROFILE) ?? "null"));
    } catch {
      /* fresh profile */
    }
    if (!p.nick) p.nick = randomNick();
    this.setProfile(withStarter(p));
  }
  private setProfile(p: Profile) {
    this.profile = p;
    try {
      localStorage.setItem(LS_PROFILE, JSON.stringify(p));
    } catch {
      /* storage unavailable */
    }
    this.dispatch({ type: "SET_UPGRADES", upgrades: p.upgrades });
    this.profileSubs.forEach((f) => f());
  }
  setNick(raw: string) {
    const nick = cleanNick(raw);
    if (nick) this.setProfile({ ...this.profile, nick });
  }
  buyUpgrade(id: UpgradeId): boolean {
    const next = buy(this.profile, id);
    if (!next) return false;
    this.setProfile(next);
    return true;
  }
  addRyo(n: number) {
    this.setProfile({ ...this.profile, ryo: this.profile.ryo + n });
  }

  // --- online duel ------------------------------------------------------------
  private duelUi: DuelUi = IDLE_DUEL;
  private duelSubs = new Set<() => void>();
  private link: Transport | null = null;
  private heartbeat: ReturnType<typeof setInterval> | null = null;
  private lastHeard = 0;
  private stopHosting: (() => void) | null = null;
  getDuel = () => this.duelUi;
  subscribeDuel = (fn: () => void) => {
    this.duelSubs.add(fn);
    return () => this.duelSubs.delete(fn);
  };
  private setDuel(p: Partial<DuelUi>) {
    this.duelUi = { ...this.duelUi, ...p };
    this.duelSubs.forEach((f) => f());
  }
  /** ?localnet=1 links two tabs of the same browser instead of going online. */
  forceLocalNet = false;
  private get localNet() {
    return this.forceLocalNet || (typeof location !== "undefined" && new URLSearchParams(location.search).has("localnet"));
  }
  async hostRoom() {
    this.leaveRoom();
    const code = newRoomCode();
    this.setDuel({ ...IDLE_DUEL, status: "hosting", code, role: "host" });
    try {
      const onJoin = (t: Transport) => this.attach(t);
      this.stopHosting = this.localNet ? await hostLocal(code, onJoin) : await hostPeer(code, onJoin);
    } catch (e) {
      this.setDuel({ status: "error", error: ((e as Error).message as NetError) || "network" });
    }
  }
  async joinRoom(raw: string) {
    const code = normalizeCode(raw);
    if (code.length !== 5) return this.setDuel({ status: "error", error: "not-found" });
    this.leaveRoom();
    this.setDuel({ ...IDLE_DUEL, status: "joining", code, role: "guest" });
    try {
      const t = this.localNet ? await joinLocal(code) : await joinPeer(code);
      this.attach(t);
    } catch (e) {
      const m = (e as Error).message;
      this.setDuel({ status: "error", error: m === "timeout" ? "not-found" : ((m as NetError) || "network") });
    }
  }
  leaveRoom() {
    try {
      this.link?.send({ t: "bye" });
    } catch {
      /* ignore */
    }
    this.link?.close();
    this.link = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    this.stopHosting?.();
    this.stopHosting = null;
    this.duelUi = IDLE_DUEL;
    this.duelSubs.forEach((f) => f());
  }
  private attach(t: Transport) {
    this.link = t;
    this.setDuel({ status: "connected", error: null });
    t.onMessage((m) => {
      this.lastHeard = Date.now();
      this.onNet(m);
    });
    t.onClose(() => this.onPeerGone());
    // Heartbeat: a friend who closed the tab or lost the connection is noticed within ~10 s.
    this.lastHeard = Date.now();
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = setInterval(() => {
      this.send({ t: "ping" });
      if (Date.now() - this.lastHeard > 10000) this.onPeerGone();
    }, 2500);
    const s = this.state;
    t.send({ t: "hello", nick: this.profile.nick, hero: s.characterId ?? "naruto", v: 1 });
  }
  private send(m: NetMessage) {
    this.link?.send(m);
  }
  private onPeerGone() {
    if (!this.link) return;
    this.link = null;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = null;
    const ph = this.state.phase;
    const fighting = ["JUTSU_SELECTION", "COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED"].includes(ph);
    if (this.state.mode === "duel" && fighting) {
      this.setDuel({ forfeit: true, status: "error", error: "left" });
      this.dispatch({ type: "DUEL_RESULT", win: true });
    } else {
      this.setDuel({ status: "error", error: "left", opponent: null, opponentReady: false });
    }
  }
  private onNet(m: NetMessage) {
    switch (m.t) {
      case "hello": {
        const hero = (m.hero in CHARACTERS ? m.hero : "naruto") as CharacterId;
        this.setDuel({ opponent: { nick: m.nick || "???", hero } });
        if (this.state.phase === "LOBBY") this.dispatch({ type: "DUEL_OPPONENT", nick: m.nick || "???", heroId: hero });
        this.send({ t: "hp", hp: this.state.playerHp, max: this.state.playerMaxHp });
        break;
      }
      case "ready":
        this.setDuel({ opponentReady: true });
        this.maybeGo();
        break;
      case "go":
        this.dispatch({ type: "DUEL_BEGIN" });
        break;
      case "hit":
        this.dispatch({ type: "REMOTE_HIT", amount: m.amount });
        break;
      case "hp":
        this.dispatch({ type: "REMOTE_HP", hp: m.hp, max: m.max });
        break;
      case "ko":
        this.dispatch({ type: "DUEL_RESULT", win: true });
        break;
      case "bye":
        this.onPeerGone();
        break;
    }
  }
  /** Host starts the fight once both players have locked in their three jutsu. */
  private maybeGo() {
    if (this.duelUi.role !== "host" || !this.duelUi.opponentReady || !this.state.duel?.ready || this.state.phase !== "JUTSU_SELECTION") return;
    this.send({ t: "go" });
    this.dispatch({ type: "DUEL_BEGIN" });
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
    const fresh = list.filter((x) => !this.dojoMastered.includes(x)).length;
    if (fresh) this.addRyo(fresh * DOJO_REWARD);
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
    if (next.mode === "duel" && this.link) this.duelSync(prev, next, a);
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

  /** Mirror local duel events to the other player. */
  private duelSync(prev: GameState, next: GameState, a: GameAction) {
    if (next.phase === "JUTSU_CAST" && prev.phase !== "JUTSU_CAST" && next.lastCast) this.send({ t: "hit", amount: next.lastCast.damage, jutsu: next.lastCast.jutsuId });
    if (a.type === "CAST_DONE" && next.lastRound && next.lastRound.burn + next.lastRound.summon > 0) this.send({ t: "hit", amount: next.lastRound.burn + next.lastRound.summon });
    if (next.playerHp !== prev.playerHp || next.playerMaxHp !== prev.playerMaxHp) this.send({ t: "hp", hp: next.playerHp, max: next.playerMaxHp });
    if (next.phase === "DEFEAT" && prev.phase !== "DEFEAT" && a.type !== "DUEL_RESULT") this.send({ t: "ko" });
    if (a.type === "CONFIRM_LOADOUT" && next.duel?.ready && !prev.duel?.ready) {
      this.send({ t: "ready" });
      this.maybeGo();
    }
    if (a.type === "DUEL_OPPONENT") this.send({ t: "hp", hp: next.playerHp, max: next.playerMaxHp });
  }

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
        const id = this.state.jutsuId!;
        this.sfx.attack(JUTSU[id].element, id);
        this.schedule(impactMs(id), () => this.sfx.impact(true));
        this.schedule(TIMING.castDuration, () => this.dispatch({ type: "CAST_DONE" }));
        break;
      }
      case "NEXT_ROUND":
        this.schedule(TIMING.nextRound, () => this.dispatch({ type: "NEXT_ROUND_DONE" }));
        break;
      case "FAILED":
        if (this.state.mode === "duel") {
          // No pause in a duel: the jutsu fizzles and the next one comes up.
          this.sfx.fail();
          this.schedule(1300, () => this.dispatch({ type: "BACK_TO_SELECTION" }));
          break;
        }
        this.sfx.enemyStrike();
        this.schedule(450, () => this.sfx.fail());
        break;
      case "DEFEAT":
        this.sfx.enemyStrike();
        this.schedule(500, () => this.sfx.defeat());
        this.payout(false);
        break;
      case "TRAINING":
        this.loadDojo();
        this.recognizer?.reset();
        this.stabilizer.reset();
        this.lastProgressAt = performance.now();
        break;
      case "VICTORY":
        this.payout(true);
        this.lastRecord = this.commitRecord(this.state);
        // After the announcer's K.O. / flawless call.
        this.schedule(2900, () => this.sfx.victory());
        if (this.state.mode === "story" && this.state.chapter != null) this.saveProgress(this.state.chapter + 1);
        break;
    }
  }

  private payout(win: boolean) {
    const s = this.state;
    if (s.mode === "training") return;
    const n = reward({ win, rank: rankFor(s.stats), mode: s.mode, chapter: s.chapter, perfect: s.stats.perfectCount });
    this.lastReward = n;
    const p = this.profile;
    this.setProfile({ ...p, ryo: p.ryo + n, wins: p.wins + (win ? 1 : 0), duelsWon: p.duelsWon + (win && s.mode === "duel" ? 1 : 0) });
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
    this.leaveRoom();
    this.phaseTimers.forEach(clearTimeout);
    this.stopTicking();
    this.stateSubs.clear();
    this.liveSubs.clear();
  }
}
