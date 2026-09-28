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
  | "VICTORY";

export type Element = "fire" | "water" | "lightning" | "chakra";
export type JutsuId = "HENGE" | "KAWARIMI" | "KAGE_BUNSHIN" | "GOKAKYU" | "CHIDORI" | "RYUKA" | "SUIRYUDAN" | "HOSENKA" | "KUCHIYOSE";
export type GameMode = "story" | "quick";

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
}

export interface CastResult {
  jutsuId: JutsuId;
  damage: number;
  perfect: boolean;
  speedBonus: number;
  perfectBonus: number;
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
  | { type: "QUIT" };

export type Rank = "S" | "A" | "B" | "C";
