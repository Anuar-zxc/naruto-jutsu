import type { SignId } from "./gestures";
import type { CharacterId } from "@/lib/game/characters";

export type Phase =
  | "IDLE"
  | "CAMERA_CHECK"
  | "READY"
  | "CHARACTER_SELECT"
  | "JUTSU_SELECTION"
  | "COUNTDOWN"
  | "PLAYING"
  | "SUCCESS"
  | "JUTSU_CAST"
  | "NEXT_ROUND"
  | "FAILED"
  | "VICTORY";

export type Element = "fire" | "water" | "lightning";
export type JutsuId = "FIRE" | "WATER" | "LIGHTNING";

export interface Jutsu {
  id: JutsuId;
  element: Element;
  /** e.g. "Fire Style" */
  style: string;
  name: string;
  kanji: string;
  sequence: SignId[];
  damage: number;
  timeLimitMs: number;
  difficulty: 1 | 2 | 3;
  color: string;
  glow: string;
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
  characterId: CharacterId | null;
  bossId: CharacterId | null;
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
  | { type: "SELECT_CHARACTER"; id: CharacterId }
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
