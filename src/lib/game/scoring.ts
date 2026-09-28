import type { GameStats, Jutsu, Rank } from "@/types/game";
import { comboMultiplier } from "./combo";

export const SIGN_POINTS = 100;
export const PERFECT_BONUS = 500;
export const PERFECT_DAMAGE_MULT = 1.25;
export const SPEED_BONUS_PER_SEC = 25;

export function pointsForSign(comboAfter: number) {
  const multiplier = comboMultiplier(comboAfter);
  return { amount: SIGN_POINTS * multiplier, multiplier };
}

export function castResult(jutsu: Jutsu, timeLeftMs: number, mistakes: number) {
  const perfect = mistakes === 0;
  const speedBonus = Math.round(Math.max(0, timeLeftMs) / 1000) * SPEED_BONUS_PER_SEC;
  const perfectBonus = perfect ? PERFECT_BONUS : 0;
  const damage = Math.round(jutsu.damage * (perfect ? PERFECT_DAMAGE_MULT : 1));
  return { perfect, speedBonus, perfectBonus, damage };
}

export function accuracy(s: GameStats): number {
  const total = s.correctSigns + s.mistakes;
  return total === 0 ? 1 : s.correctSigns / total;
}

/**
 * Rank from 0..100 points:
 *   accuracy     up to 60
 *   speed        up to 30  (≤45 s of seal time → 30, ≥150 s → 0)
 *   max combo    up to 10  (a 10-seal streak or longer)
 *   −8 per failed jutsu
 */
export function rankPoints(s: GameStats): number {
  const acc = accuracy(s) * 60;
  const sec = s.playMs / 1000;
  const speed = Math.max(0, Math.min(30, (30 * (150 - sec)) / 105));
  const combo = Math.min(10, s.maxCombo);
  return Math.max(0, Math.round(acc + speed + combo - 8 * s.failedCount));
}

export function rankFor(s: GameStats): Rank {
  const p = rankPoints(s);
  if (p >= 85) return "S";
  if (p >= 70) return "A";
  if (p >= 50) return "B";
  return "C";
}
