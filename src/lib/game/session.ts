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
import { TRAIN_MASTERY, currentSequence, gameReducer, initialGameState } from "./gameState";
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
import { CHARACTERS, survivalBossFor } from "./characters";
import { ACHIEVEMENTS, emptyCounters, isDone, type Achievement, type Counters } from "./achievements";
import { dailyFor, todayKey } from "./mutators";
import { UPGRADES } from "./profile";
import { sumBonuses, type Bonuses } from "./bonuses";
import { CLANS, CLAN_SWITCH_COST, canLearn, clanBonuses, spentPoints, type ClanId } from "./clans";
import { ITEMS, type ItemId, type ItemSlot } from "./items";
import { levelFor, rewardFor, xpFor, type FrameId, type PassReward, type TitleId } from "./pass";
import { CLASH_WINDOW_MS } from "./party";
import { submitScore } from "@/lib/net/leaderboard";
import type { JutsuId } from "@/types/game";

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

// v2: the 27-chapter story. Old 13-chapter progress is carried over proportionally.
const LS_PROGRESS = "shinobi.progress.v2";
const LS_PROGRESS_V1 = "shinobi.progress";
const LS_SURVIVAL = "shinobi.survival.best";
const LS_COUNTERS = "shinobi.counters";
const LS_ACH = "shinobi.achievements";
const LS_DAILY = "shinobi.daily.won";
const V1_CHAPTERS = 13;
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
  /** Survival: pause between waves (banner + reward). */
  waveBreak: 3400,
  /** Survival: a boon is picked for you if you don't choose within this time. */
  boonAutoPick: 20000,
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
      let raw = localStorage.getItem(LS_PROGRESS);
      if (raw == null) {
        const old = Number(localStorage.getItem(LS_PROGRESS_V1) ?? 0);
        raw = String(Number.isFinite(old) && old > 0 ? Math.round((Math.min(old, V1_CHAPTERS) / V1_CHAPTERS) * CHAPTERS.length) : 0);
      }
      const n = Number(raw);
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
    this.bump((c) => (c.storyCleared = Math.max(c.storyCleared, this.progress)));
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
    if (s.mode === "party") return "party";
    if (s.mode === "daily") return `daily:${todayKey()}`;
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

  // --- achievements -------------------------------------------------------------
  private counters: Counters = emptyCounters();
  private unlocked = new Set<string>();
  private achSubs = new Set<() => void>();
  /** Recently unlocked (for toasts): newest last. */
  achToasts: { ach: Achievement; key: number }[] = [];
  private achVersion = 0;
  getAchVersion = () => this.achVersion;
  subscribeAch = (fn: () => void) => {
    this.achSubs.add(fn);
    return () => this.achSubs.delete(fn);
  };
  getCounters = () => this.counters;
  isUnlocked = (id: string) => this.unlocked.has(id);
  loadAchievements() {
    try {
      const c = JSON.parse(localStorage.getItem(LS_COUNTERS) ?? "null");
      if (c && typeof c === "object") this.counters = { ...emptyCounters(), ...c };
      const u = JSON.parse(localStorage.getItem(LS_ACH) ?? "[]");
      if (Array.isArray(u)) this.unlocked = new Set(u.filter((x) => typeof x === "string"));
    } catch {
      /* fresh */
    }
    // Credit what the player already did before achievements existed.
    this.loadDojo();
    this.bump((c) => {
      c.storyCleared = Math.max(c.storyCleared, this.progress);
      c.dojoMastered = Math.max(c.dojoMastered, this.dojoMastered.length);
      c.bestWave = Math.max(c.bestWave, this.survivalBest.wave);
      c.wins = Math.max(c.wins, this.profile.wins);
      c.duelWins = Math.max(c.duelWins, this.profile.duelsWon);
      c.maxRyo = Math.max(c.maxRyo, this.profile.ryo);
      c.level = Math.max(c.level, levelFor(this.profile.xp));
      c.itemsOwned = Math.max(c.itemsOwned, this.profile.owned.length);
      if (this.profile.clan) c.clanJoined = 1;
    });
  }
  /** Update lifetime counters, persist, and unlock whatever became true. */
  private bump(fn: (c: Counters) => void) {
    const c = { ...this.counters, winsWith: [...this.counters.winsWith], beaten: [...this.counters.beaten] };
    fn(c);
    this.counters = c;
    try {
      localStorage.setItem(LS_COUNTERS, JSON.stringify(c));
    } catch {
      /* storage unavailable */
    }
    let gained = 0;
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id) || !isDone(a, c)) continue;
      this.unlocked.add(a.id);
      gained += a.reward;
      this.achToasts = [...this.achToasts.slice(-4), { ach: a, key: Date.now() + Math.random() }];
    }
    if (gained) {
      try {
        localStorage.setItem(LS_ACH, JSON.stringify([...this.unlocked]));
      } catch {
        /* storage unavailable */
      }
      this.profile = { ...this.profile, ryo: this.profile.ryo + gained };
      try {
        localStorage.setItem(LS_PROFILE, JSON.stringify(this.profile));
      } catch {
        /* storage unavailable */
      }
      this.profileSubs.forEach((f) => f());
      setTimeout(() => this.sfx.mastered(), 300);
    }
    this.achVersion++;
    this.achSubs.forEach((f) => f());
  }
  private trackFight(s: GameState, win: boolean) {
    if (s.mode === "party") {
      this.bump((c) => (c.partyGames += 1));
      return;
    }
    this.bump((c) => {
      c.fights += 1;
      c.bestCombo = Math.max(c.bestCombo, s.stats.maxCombo);
      if (!win) return;
      c.wins += 1;
      if (s.playerHp >= s.playerMaxHp) c.flawless += 1;
      if (s.playerHp <= s.playerMaxHp * 0.1) c.clutch += 1;
      if (s.stats.mistakes === 0) c.cleanWins += 1;
      if (s.stats.playMs > 0 && s.stats.playMs < 40000) c.fastWins += 1;
      if (s.characterId && !c.winsWith.includes(s.characterId)) c.winsWith.push(s.characterId);
      if (s.mode !== "duel" && s.bossId && !c.beaten.includes(s.bossId)) c.beaten.push(s.bossId);
      if (s.mode === "duel") c.duelWins += 1;
      if (s.mode === "daily") c.dailyWins += 1;
    });
  }

  // --- Daily challenge ---------------------------------------------------------
  daily = () => dailyFor(todayKey());
  dailyDone = () => {
    try {
      return localStorage.getItem(LS_DAILY) === todayKey();
    } catch {
      return false;
    }
  };

  // --- photo of the player's final seal (for the battle card) -----------------------
  /** JPEG data URL of the camera at the last completed seal sequence of this fight. */
  snapshot: string | null = null;
  captureSnapshot(src: HTMLCanvasElement | null) {
    if (!src || !src.width) return;
    try {
      const w = 640;
      const h = Math.round((src.height / src.width) * w);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(src, 0, 0, w, h);
      this.snapshot = c.toDataURL("image/jpeg", 0.82);
    } catch {
      /* tainted or unavailable — the card simply goes without a photo */
    }
  }

  // --- survival best run, persisted per browser ---------------------------------
  private survivalBest: { wave: number; earned: number } = { wave: 0, earned: 0 };
  /** Result of the survival run that just ended (for the result panel). */
  lastSurvival: { waves: number; earned: number; isNew: boolean } | null = null;
  getSurvivalBest = () => this.survivalBest;
  loadSurvivalBest() {
    try {
      const v = JSON.parse(localStorage.getItem(LS_SURVIVAL) ?? "null");
      if (v && typeof v.wave === "number") this.survivalBest = { wave: Math.max(0, Math.floor(v.wave)), earned: Math.max(0, Math.floor(v.earned ?? 0)) };
    } catch {
      /* ignore */
    }
  }
  private commitSurvival(s: GameState) {
    const waves = Math.max(0, (s.survival?.wave ?? 1) - 1);
    const earned = s.survival?.earned ?? 0;
    const isNew = waves > this.survivalBest.wave;
    if (isNew) {
      this.survivalBest = { wave: waves, earned };
      try {
        localStorage.setItem(LS_SURVIVAL, JSON.stringify(this.survivalBest));
      } catch {
        /* storage unavailable */
      }
    }
    this.lastSurvival = { waves, earned, isNew };
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
    if (p.ryo > this.counters.maxRyo) this.bump((c) => (c.maxRyo = p.ryo));
    try {
      localStorage.setItem(LS_PROFILE, JSON.stringify(p));
    } catch {
      /* storage unavailable */
    }
    this.dispatch({ type: "SET_UPGRADES", upgrades: p.upgrades });
    this.dispatch({ type: "SET_BONUSES", bonuses: this.bonusesOf(p) });
    this.profileSubs.forEach((f) => f());
  }
  /** Everything permanent summed: clan passive + talents + eye + weapon. */
  bonusesOf(p: Profile = this.profile): Bonuses {
    return sumBonuses([...clanBonuses(p.clan, p.talents), p.eye ? ITEMS[p.eye].bonus : null, p.weapon ? ITEMS[p.weapon].bonus : null]);
  }

  // --- clans & talents ------------------------------------------------------------
  /** Talent points = shinobi level. */
  talentPoints = () => levelFor(this.profile.xp);
  freePoints = () => this.talentPoints() - spentPoints(this.profile.clan, this.profile.talents);
  joinClan(id: ClanId): boolean {
    const p = this.profile;
    if (p.clan === id) return false;
    const cost = p.clan ? CLAN_SWITCH_COST : 0;
    if (p.ryo < cost) return false;
    this.setProfile({ ...p, clan: id, talents: [], ryo: p.ryo - cost });
    this.bump((c) => (c.clanJoined = 1));
    return true;
  }
  learnTalent(id: string): boolean {
    const p = this.profile;
    if (!canLearn(p.clan, p.talents, id, this.talentPoints())) return false;
    const talents = [...p.talents, id];
    this.setProfile({ ...p, talents });
    const cap = p.clan ? CLANS[p.clan].talents.find((x) => x.tier === 4)?.id : null;
    this.bump((c) => {
      c.talents = Math.max(c.talents, talents.length);
      if (cap && talents.includes(cap)) c.capstone = 1;
    });
    return true;
  }
  resetTalents() {
    this.setProfile({ ...this.profile, talents: [] });
  }

  // --- armory -------------------------------------------------------------------
  buyItem(id: ItemId): boolean {
    const p = this.profile;
    const it = ITEMS[id];
    if (p.owned.includes(id) || p.ryo < it.price) return false;
    const owned = [...p.owned, id];
    // A new item is equipped straight away if that slot is empty.
    const slotKey = it.slot === "eye" ? "eye" : "weapon";
    this.setProfile({ ...p, ryo: p.ryo - it.price, owned, [slotKey]: p[slotKey] ?? id });
    this.bump((c) => (c.itemsOwned = Math.max(c.itemsOwned, owned.length)));
    return true;
  }
  equip(id: ItemId) {
    const p = this.profile;
    if (!p.owned.includes(id)) return;
    const slotKey = ITEMS[id].slot === "eye" ? "eye" : "weapon";
    this.setProfile({ ...p, [slotKey]: p[slotKey] === id ? null : id });
  }
  unequip(slot: ItemSlot) {
    this.setProfile({ ...this.profile, [slot === "eye" ? "eye" : "weapon"]: null });
  }

  // --- Shinobi Path (season pass) -------------------------------------------------
  /** XP earned by the fight that just ended (for the result screen). */
  lastXp: { gained: number; levelUps: { level: number; reward: PassReward }[] } | null = null;
  levelToasts: { level: number; reward: PassReward; key: number }[] = [];
  addXp(n: number) {
    const p = this.profile;
    const gained = Math.round(n * (1 + this.bonusesOf(p).xp));
    if (gained <= 0) return (this.lastXp = { gained: 0, levelUps: [] });
    const xp = p.xp + gained;
    const lvl = levelFor(xp);
    const levelUps: { level: number; reward: PassReward }[] = [];
    let next: Profile = { ...p, xp };
    for (let l = p.passPaid + 1; l <= lvl; l++) {
      const r = rewardFor(l);
      levelUps.push({ level: l, reward: r });
      if (r.kind === "ryo") next = { ...next, ryo: next.ryo + r.n };
      if (r.kind === "title") next = { ...next, title: r.id };
      if (r.kind === "frame" && !next.frame) next = { ...next, frame: r.id };
    }
    next = { ...next, passPaid: Math.max(p.passPaid, lvl) };
    this.setProfile(next);
    this.lastXp = { gained, levelUps };
    if (levelUps.length) {
      this.levelToasts = [...this.levelToasts.slice(-3), ...levelUps.map((u) => ({ ...u, key: Date.now() + Math.random() }))];
      setTimeout(() => this.sfx.mastered(), 600);
    }
    this.bump((c) => (c.level = Math.max(c.level, lvl)));
  }
  setTitle(id: TitleId | null) {
    this.setProfile({ ...this.profile, title: id });
  }
  setFrame(id: FrameId | null) {
    this.setProfile({ ...this.profile, frame: id });
  }
  setNick(raw: string) {
    const nick = cleanNick(raw);
    if (nick) this.setProfile({ ...this.profile, nick });
  }
  buyUpgrade(id: UpgradeId): boolean {
    const next = buy(this.profile, id);
    if (!next) return false;
    this.setProfile(next);
    this.bump((c) => {
      c.upgradesBought += 1;
      c.allUpgradesMaxed = UPGRADES.every((u) => next.upgrades[u.id] >= u.max);
    });
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
  private lastLocalCast: { t: number; jutsu: JutsuId; damage: number } | null = null;
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
      case "hit": {
        // Two jutsu that meet mid-air collide: yours absorbs half its power from theirs.
        const mine = this.lastLocalCast;
        if (m.jutsu && mine && Date.now() - mine.t < CLASH_WINDOW_MS) {
          this.lastLocalCast = null;
          const absorbed = Math.min(m.amount, Math.round(mine.damage * 0.5));
          this.sfx.impact(true);
          this.dispatch({ type: "REMOTE_HIT", amount: m.amount - absorbed, clash: { mine: mine.jutsu, theirs: m.jutsu, absorbed } });
        } else this.dispatch({ type: "REMOTE_HIT", amount: m.amount });
        break;
      }
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
    this.bump((c) => (c.dojoMastered = Math.max(c.dojoMastered, this.dojoMastered.length)));
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

    if (next.phase === "JUTSU_CAST" && prev.phase !== "JUTSU_CAST" && next.lastCast) {
      const tags = next.lastCast.tags;
      const perfect = next.lastCast.perfect;
      this.bump((c) => {
        c.casts += 1;
        if (perfect) c.perfectCasts += 1;
        if (tags.includes("sage")) c.sageCasts += 1;
        if (tags.includes("shout")) c.shouts += 1;
        if (tags.includes("genjutsu")) c.genjutsuBroken += 1;
        if (tags.includes("team")) c.teamCombos += 1;
        c.bestCombo = Math.max(c.bestCombo, next.stats.maxCombo);
      });
    }
    if (a.type === "PICK_BOON") {
      this.sfx.detected();
      this.bump((c) => (c.boonsPicked += 1));
      const next2 = survivalBossFor(next.characterId ?? "naruto", (next.survival?.wave ?? 1) + 1, next.bossId);
      this.schedule(900, () => this.dispatch({ type: "NEXT_WAVE", bossId: next2 }));
    }

    if (next.phase !== prev.phase) this.enterPhase(next.phase, prev.phase);
    this.stateSubs.forEach((f) => f());
  };

  /** Mirror local duel events to the other player. */
  private duelSync(prev: GameState, next: GameState, a: GameAction) {
    if (next.phase === "JUTSU_CAST" && prev.phase !== "JUTSU_CAST" && next.lastCast) {
      this.lastLocalCast = { t: Date.now(), jutsu: next.lastCast.jutsuId, damage: next.lastCast.damage };
      this.send({ t: "hit", amount: next.lastCast.damage, jutsu: next.lastCast.jutsuId });
    }
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
        if (this.state.mode === "duel" || this.state.mode === "party") {
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
        this.trackFight(this.state, false);
        if (this.state.mode === "survival") {
          // Wave rewards were banked as they were earned; just record the run.
          this.commitSurvival(this.state);
          this.lastReward = this.state.survival?.earned ?? 0;
          const waves = this.lastSurvival?.waves ?? 0;
          this.addXp(xpFor({ win: false, rank: "C", mode: "survival", waves }));
          if (waves > 0) void submitScore("survival", this.profile.nick, waves, this.state.characterId ?? "naruto");
        } else this.payout(false);
        break;
      case "WAVE_CLEAR": {
        const s = this.state;
        const r = s.survival?.lastReward ?? 0;
        this.setProfile({ ...this.profile, ryo: this.profile.ryo + r });
        this.sfx.announce("ko");
        this.schedule(900, () => this.sfx.mastered());
        const wave = s.survival?.wave ?? 1;
        const boss = s.bossId;
        this.bump((c) => {
          c.bestWave = Math.max(c.bestWave, wave);
          c.bestCombo = Math.max(c.bestCombo, s.stats.maxCombo);
          if (boss && !c.beaten.includes(boss)) c.beaten.push(boss);
        });
        // The player picks a boon (finger, mouse or keys 1–3); nobody is left waiting forever.
        const offer = s.survival?.offer;
        if (offer?.length) this.schedule(TIMING.boonAutoPick, () => this.dispatch({ type: "PICK_BOON", id: offer[0] }));
        else {
          const next = survivalBossFor(s.characterId ?? "naruto", wave + 1, s.bossId);
          this.schedule(TIMING.waveBreak, () => this.dispatch({ type: "NEXT_WAVE", bossId: next }));
        }
        break;
      }
      case "TRAINING":
        this.loadDojo();
        this.recognizer?.reset();
        this.stabilizer.reset();
        this.lastProgressAt = performance.now();
        break;
      case "VICTORY":
        this.trackFight(this.state, true);
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
    let n = reward({ win, rank: rankFor(s.stats), mode: s.mode, chapter: s.chapter, perfect: s.stats.perfectCount });
    if (s.mode === "daily" && win) {
      // The big daily prize is paid once per day; replays pay the normal amount.
      if (!this.dailyDone()) n += this.daily().reward;
      try {
        localStorage.setItem(LS_DAILY, todayKey());
      } catch {
        /* storage unavailable */
      }
    }
    if (s.mode !== "party") n = Math.round(n * (1 + this.bonusesOf().ryo));
    this.lastReward = n;
    const p = this.profile;
    const counts = s.mode !== "party";
    this.setProfile({ ...p, ryo: p.ryo + n, wins: p.wins + (win && counts ? 1 : 0), duelsWon: p.duelsWon + (win && s.mode === "duel" ? 1 : 0) });
    this.addXp(xpFor({ win, rank: rankFor(s.stats), mode: s.mode }));
    if (s.mode === "daily" && win) void submitScore(`daily:${todayKey()}`, this.profile.nick, s.stats.score, s.characterId ?? "naruto");
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
    const seq = currentSequence(s);
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
