/**
 * Game state machine — a pure reducer. No timers, no audio, no DOM:
 * side effects live in GameSession, rendering lives in React.
 *
 *   IDLE → CAMERA_CHECK → READY → CHARACTER_SELECT → JUTSU_SELECTION → COUNTDOWN → PLAYING
 *        PLAYING → SUCCESS → JUTSU_CAST → NEXT_ROUND → JUTSU_SELECTION …
 *                                       ↘ VICTORY (boss HP = 0)
 *        PLAYING → FAILED (time out) → COUNTDOWN (retry) | JUTSU_SELECTION
 */
import type { GameAction, GameState, GameStats, Phase } from "@/types/game";
import { BOSS, JUTSU } from "./jutsu";
import { castResult, pointsForSign } from "./scoring";
import { CHARACTERS, bossFor, damageMultiplier } from "./characters";

export const emptyStats = (): GameStats => ({
  score: 0,
  combo: 0,
  maxCombo: 0,
  correctSigns: 0,
  mistakes: 0,
  castCount: 0,
  perfectCount: 0,
  failedCount: 0,
  playMs: 0,
  totalDamage: 0,
});

export const initialGameState = (): GameState => ({
  phase: "IDLE",
  round: 1,
  characterId: null,
  bossId: null,
  bossHp: BOSS.maxHp,
  bossMaxHp: BOSS.maxHp,
  jutsuId: null,
  seqIndex: 0,
  timeLeftMs: 0,
  countdown: 0,
  jutsuMistakes: 0,
  stats: emptyStats(),
  lastCast: null,
  lastPoints: null,
  eventId: 0,
});

/** Which actions are legal in which phase — anything else is ignored. */
const ALLOWED: Record<GameAction["type"], Phase[]> = {
  START: ["IDLE"],
  CAMERA_READY: ["CAMERA_CHECK"],
  ENTER_SELECTION: ["READY"],
  SELECT_CHARACTER: ["CHARACTER_SELECT"],
  CHANGE_CHARACTER: ["JUTSU_SELECTION"],
  SELECT_JUTSU: ["JUTSU_SELECTION"],
  COUNTDOWN_TICK: ["COUNTDOWN"],
  TICK: ["PLAYING"],
  SIGN: ["PLAYING"],
  MISTAKE: ["PLAYING"],
  SUCCESS_DONE: ["SUCCESS"],
  CAST_DONE: ["JUTSU_CAST"],
  NEXT_ROUND_DONE: ["NEXT_ROUND"],
  RETRY: ["FAILED"],
  BACK_TO_SELECTION: ["FAILED", "COUNTDOWN"],
  RESTART: ["VICTORY", "FAILED", "JUTSU_SELECTION"],
  QUIT: ["CAMERA_CHECK", "READY", "CHARACTER_SELECT", "JUTSU_SELECTION", "COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED", "VICTORY"],
};

export const COUNTDOWN_FROM = 3;

/** Jutsu time limit including the hero's perk. */
export function timeLimit(s: GameState, base: number): number {
  const bonus = s.characterId ? CHARACTERS[s.characterId].timeBonusMs : 0;
  return Math.max(5000, base + bonus);
}

export function gameReducer(s: GameState, a: GameAction): GameState {
  if (!ALLOWED[a.type].includes(s.phase)) return s;

  switch (a.type) {
    case "START":
      return { ...initialGameState(), phase: "CAMERA_CHECK" };

    case "CAMERA_READY":
      return { ...s, phase: "READY" };

    case "ENTER_SELECTION":
      return { ...s, phase: "CHARACTER_SELECT" };

    case "SELECT_CHARACTER":
      return { ...s, phase: "JUTSU_SELECTION", characterId: a.id, bossId: bossFor(a.id) };

    case "CHANGE_CHARACTER":
      // Switching hero restarts the fight against the new opponent.
      return { ...initialGameState(), phase: "CHARACTER_SELECT" };

    case "SELECT_JUTSU": {
      const j = JUTSU[a.id];
      return { ...s, phase: "COUNTDOWN", jutsuId: a.id, seqIndex: 0, timeLeftMs: timeLimit(s, j.timeLimitMs), countdown: COUNTDOWN_FROM, jutsuMistakes: 0 };
    }

    case "COUNTDOWN_TICK": {
      const c = s.countdown - 1;
      return c <= 0 ? { ...s, countdown: 0, phase: "PLAYING" } : { ...s, countdown: c };
    }

    case "TICK": {
      const timeLeftMs = s.timeLeftMs - a.dt;
      const stats = { ...s.stats, playMs: s.stats.playMs + a.dt };
      if (timeLeftMs <= 0) {
        return { ...s, timeLeftMs: 0, phase: "FAILED", stats: { ...stats, combo: 0, failedCount: stats.failedCount + 1 } };
      }
      return { ...s, timeLeftMs, stats };
    }

    case "SIGN": {
      const j = s.jutsuId ? JUTSU[s.jutsuId] : null;
      if (!j || j.sequence[s.seqIndex] !== a.sign) return s;
      const combo = s.stats.combo + 1;
      const pts = pointsForSign(combo);
      const seqIndex = s.seqIndex + 1;
      const stats: GameStats = {
        ...s.stats,
        combo,
        maxCombo: Math.max(s.stats.maxCombo, combo),
        correctSigns: s.stats.correctSigns + 1,
        score: s.stats.score + pts.amount,
      };
      return {
        ...s,
        seqIndex,
        stats,
        eventId: s.eventId + 1,
        lastPoints: { ...pts, id: s.eventId + 1 },
        phase: seqIndex >= j.sequence.length ? "SUCCESS" : "PLAYING",
      };
    }

    case "MISTAKE":
      return {
        ...s,
        jutsuMistakes: s.jutsuMistakes + 1,
        eventId: s.eventId + 1,
        stats: { ...s.stats, mistakes: s.stats.mistakes + 1, combo: 0 },
      };

    case "SUCCESS_DONE": {
      const j = JUTSU[s.jutsuId!];
      const hero = s.characterId ? CHARACTERS[s.characterId] : null;
      const r = castResult(j, s.timeLeftMs, s.jutsuMistakes, damageMultiplier(hero, j.element));
      const bossHp = Math.max(0, s.bossHp - r.damage);
      return {
        ...s,
        phase: "JUTSU_CAST",
        bossHp,
        lastCast: { jutsuId: j.id, ...r },
        stats: {
          ...s.stats,
          score: s.stats.score + r.speedBonus + r.perfectBonus,
          castCount: s.stats.castCount + 1,
          perfectCount: s.stats.perfectCount + (r.perfect ? 1 : 0),
          totalDamage: s.stats.totalDamage + (s.bossHp - bossHp),
        },
      };
    }

    case "CAST_DONE":
      return { ...s, phase: s.bossHp <= 0 ? "VICTORY" : "NEXT_ROUND" };

    case "NEXT_ROUND_DONE":
      return { ...s, phase: "JUTSU_SELECTION", round: s.round + 1, jutsuId: null, seqIndex: 0 };

    case "RETRY": {
      const j = JUTSU[s.jutsuId!];
      return { ...s, phase: "COUNTDOWN", seqIndex: 0, timeLeftMs: timeLimit(s, j.timeLimitMs), countdown: COUNTDOWN_FROM, jutsuMistakes: 0 };
    }

    case "BACK_TO_SELECTION":
      return { ...s, phase: "JUTSU_SELECTION", jutsuId: null, seqIndex: 0 };

    case "RESTART":
      return { ...initialGameState(), phase: "JUTSU_SELECTION", characterId: s.characterId, bossId: s.bossId };

    case "QUIT":
      return initialGameState();
  }
}
