/**
 * Combo rules: consecutive correct seals (across jutsu) build a multiplier.
 * A counted mistake or a failed jutsu resets it.
 *   3+ in a row → ×2
 *   5+ in a row → ×3
 */
export function comboMultiplier(combo: number): 1 | 2 | 3 {
  if (combo >= 5) return 3;
  if (combo >= 3) return 2;
  return 1;
}

/** True when this combo count just crossed into a new multiplier tier. */
export function isComboMilestone(combo: number): boolean {
  return combo === 3 || combo === 5;
}
