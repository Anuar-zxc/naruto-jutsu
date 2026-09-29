import type { SignId } from "./gestures";
import type { CharacterId } from "@/lib/game/characters";
import type { L } from "./i18n";

export type Phase =
  | "IDLE"
  | "CAMERA_CHECK"
  | "READY"
  | "MODE_SELECT"
  | "CHARACTER_SELECT"
  | "CHAPTER_SELECT"
  | "DIALOGUE"
  | "JUTSU_SELECTION"
  | "COUNTDOWN"
  | "PLAYING"
  | "SUCCESS"
  | "JUTSU_CAST"
  | "NEXT_ROUND"
  | "FAILED"
  | "DEFEAT"
  | "TRAINING"
  | "VICTORY";

export type Element = "fire" | "water" | "lightning" | "chakra" | "wind";
export type JutsuId = "HENGE" | "KAWARIMI" | "KAGE_BUNSHIN" | "GOKAKYU" | "CHIDORI" | "RYUKA" | "SUIRYUDAN" | "HOSENKA" | "KUCHIYOSE" | "RASENGAN" | "KIRIN" | "RASENSHURIKEN";

/** What a jutsu does besides its damage — the reason to pick it for your three. */
export type JutsuEffect =
  | { kind: "shield"; hits: number }
  | { kind: "boost"; mult: number }
  | { kind: "burn"; dmg: number; turns: number }
  | { kind: "heal"; hp: number }
  | { kind: "pierce"; perfectMult: number }
  | { kind: "combo"; perCombo: number }
  | { kind: "summon"; dmg: number; turns: number; hits: number }
  | { kind: "execute"; belowPct: number; mult: number }
  | { kind: "recoil"; hp: number }
  | { kind: "none" };

/** Buffs/debuffs active in the current fight. */
export interface Status {
  /** Enemy strikes that will be blocked. */
  shield: number;
  /** Damage multiplier for the NEXT jutsu (1 = none). */
  boost: number;
  burn: { dmg: number; turns: number } | null;
  summon: { dmg: number; turns: number } | null;
}

/** What happened at the end of a round (for the round banner). */
export interface RoundReport {
  burn: number;
  summon: number;
  /** Enemy retaliation damage actually taken (0 if blocked or staggered). */
  retaliation: number;
  blocked: boolean;
  staggered: boolean;
  healed: number;
  id: number;
}
export type GameMode = "story" | "quick" | "training";

export interface Jutsu {
  id: JutsuId;
  element: Element;
  name: L;
  /** Original Japanese name, romanised. */
  romaji: string;
  kanji: string;
  sequence: SignId[];
  damage: number;
  timeLimitMs: number;
  difficulty: 1 | 2 | 3;
  color: string;
  glow: string;
  effect: JutsuEffect;
  /** e.g. "abridged: first 6 of 44 seals" */
  note?: L;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  correctSigns: number;
  mistakes: number;
  castCount: number;
  perfectCount: number;
  failedCount: number;
  /** Time actually spent performing seals (ms). */
  playMs: number;
  totalDamage: number;
  /** Mistakes per seal the player was SUPPOSED to make (for the sensei's review). */
  weak: Partial<Record<SignId, number>>;
}

export interface CastResult {
  jutsuId: JutsuId;
  damage: number;
  perfect: boolean;
  speedBonus: number;
  perfectBonus: number;
  /** Short labels for what the effect did, e.g. "shield", "crit". */
  tags: string[];
}

export interface GameState {
  phase: Phase;
  round: number;
  mode: GameMode;
  characterId: CharacterId | null;
  bossId: CharacterId | null;
  /** Story chapter index (0-based), null in quick battle. */
  chapter: number | null;
  dialogue: { part: "intro" | "outro"; index: number } | null;
  bossHp: number;
  bossMaxHp: number;
  /** Player chakra/health: the enemy strikes back when a jutsu fails. */
  playerHp: number;
  playerMaxHp: number;
  /** Damage of the last enemy counter-attack (for the UI). */
  lastEnemyHit: { amount: number; id: number } | null;
  /** The three jutsu chosen for this fight, and which one is up. */
  loadout: JutsuId[];
  slot: number;
  status: Status;
  lastRound: RoundReport | null;
  /** Chakra lost to the last wrong seal (for the UI). */
  lastMistakeCost: { hp: number; ms: number; id: number } | null;
  /** Dojo (training mode): current target seal, streak and mastered seals. */
  training: { sign: SignId; streak: number; mastered: SignId[]; hits: number } | null;
  jutsuId: JutsuId | null;
  seqIndex: number;
  timeLeftMs: number;
  countdown: number;
  jutsuMistakes: number;
  stats: GameStats;
  lastCast: CastResult | null;
  /** Points awarded by the last correct seal (for the floating "+200" popup). */
  lastPoints: { amount: number; multiplier: number; id: number } | null;
  /** Monotonic counter bumped on every seal/mistake so the UI can animate. */
  eventId: number;
}

export type GameAction =
  | { type: "START" }
  | { type: "CAMERA_READY" }
  | { type: "ENTER_SELECTION" }
  | { type: "SELECT_MODE"; mode: GameMode }
  | { type: "SELECT_CHAPTER"; index: number }
  | { type: "DIALOGUE_NEXT" }
  | { type: "DIALOGUE_SKIP" }
  | { type: "STORY_OUTRO" }
  | { type: "BACK_TO_CHAPTERS" }
  | { type: "BACK_TO_MENU" }
  | { type: "SELECT_CHARACTER"; id: CharacterId; bossId?: CharacterId }
  | { type: "CHANGE_CHARACTER" }
  | { type: "SELECT_JUTSU"; id: JutsuId }
  | { type: "TOGGLE_LOADOUT"; id: JutsuId }
  | { type: "CONFIRM_LOADOUT" }
  | { type: "SELECT_SLOT"; slot: number }
  | { type: "COUNTDOWN_TICK" }
  | { type: "TICK"; dt: number }
  | { type: "SIGN"; sign: SignId }
  | { type: "MISTAKE"; sign: SignId | null }
  | { type: "SUCCESS_DONE" }
  | { type: "CAST_DONE" }
  | { type: "NEXT_ROUND_DONE" }
  | { type: "RETRY" }
  | { type: "BACK_TO_SELECTION" }
  | { type: "RESTART" }
  | { type: "QUIT" }
  | { type: "TRAIN_SELECT"; sign: SignId }
  | { type: "TRAIN_HIT" };

export type Rank = "S" | "A" | "B" | "C";
