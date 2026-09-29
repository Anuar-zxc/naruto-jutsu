/**
 * Scoring primitives shared by the recognizer and the correction engine.
 * Pure functions, no state.
 */
import type { FrameFeatures, HandFeatures, HandShapeId, LongFinger, SignDefinition, SignScore } from "@/types/gestures";
import { LONG_FINGERS } from "@/types/gestures";
import { HAND_SHAPES } from "./gestureDefinitions";
import { clamp01 } from "./gestureFeatures";

// ---------------------------------------------------------------------------

/**
 * Score one finger against its target (1 = extended, 0 = curled).
 * error ≤ tol/2 → 1.0, error = tol → 0.5, error ≥ tol + 0.25 → 0.
 */
export function fingerScore(ext: number, target: 0 | 1, tol: number): number {
  const err = Math.abs(target - ext);
  const full = tol * 0.5;
  const zero = tol + 0.25;
  if (err <= full) return 1;
  if (err >= zero) return 0;
  // Piecewise linear through (full,1) (tol,0.5) (zero,0)
  if (err <= tol) return 1 - 0.5 * ((err - full) / (tol - full));
  return 0.5 * (1 - (err - tol) / (zero - tol));
}

/** Blend of mean and minimum: one badly wrong finger must sink the score. */
const softMin = (xs: number[]) => {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return 0.4 * mean + 0.6 * Math.min(...xs);
};

export function handShapeScore(hand: HandFeatures, shape: HandShapeId, tol: number): number {
  const target = HAND_SHAPES[shape].fingers;
  return softMin(LONG_FINGERS.map((f: LongFinger) => fingerScore(hand.ext[f], target[f], tol)));
}

export function distanceFactor(def: SignDefinition, d: number | null): number {
  if (!def.distance || d == null) return 1;
  const RAMP = 1.2;
  let f = 1;
  if (def.distance.max != null && d > def.distance.max) f = Math.min(f, 1 - (d - def.distance.max) / RAMP);
  if (def.distance.min != null && d < def.distance.min) f = Math.min(f, 1 - (def.distance.min - d) / RAMP);
  return clamp01(f);
}

const UP_OK = 40;
const UP_BAD = 95;
const DOWN_OK = 125;
const DOWN_BAD = 80;

function handOrientation(def: SignDefinition, h: HandFeatures): number {
  const a = Math.abs(h.pointing);
  if (def.pointUp) return a <= UP_OK ? 1 : a >= UP_BAD ? 0 : 1 - (a - UP_OK) / (UP_BAD - UP_OK);
  if (def.pointDown) return a >= DOWN_OK ? 1 : a <= DOWN_BAD ? 0 : (a - DOWN_BAD) / (DOWN_OK - DOWN_BAD);
  return 1;
}

export function orientationFactor(def: SignDefinition, hands: HandFeatures[]): number {
  if (!def.pointUp && !def.pointDown) return 1;
  return Math.min(...hands.map((h) => handOrientation(def, h)));
}

/**
 * Vertical offset (in palm lengths) of `top` above `other`; positive = `top` is higher.
 */
export function heightAbove(top: HandFeatures, other: HandFeatures): number {
  const palm = (top.size + other.size) / 2 || 1;
  return (other.center.y - top.center.y) / palm;
}

export function stackFactor(def: SignDefinition, left: HandFeatures, right: HandFeatures, asg: { left: HandShapeId; right: HandShapeId }): number {
  if (!def.stack) return 1;
  if (def.stack === "side") {
    const dy = Math.abs(heightAbove(left, right));
    return dy <= 0.9 ? 1 : dy >= 1.6 ? 0 : 1 - (dy - 0.9) / 0.7;
  }
  if (def.stack === "stacked") {
    const dy = Math.abs(heightAbove(left, right));
    return dy >= 1.0 ? 1 : dy <= 0.3 ? 0 : (dy - 0.3) / 0.7;
  }
  // topFirst: the hand making shapes[0] must be above the other.
  const [top, other] = asg.left === def.shapes[0] ? [left, right] : [right, left];
  const dy = heightAbove(top, other);
  return dy >= 1.0 ? 1 : dy <= 0.3 ? 0 : (dy - 0.3) / 0.7;
}

/**
 * Best shape assignment for a two-hand seal. For asymmetric seals (e.g. OX = open + fist)
 * either hand may take either role; we try both and keep the better.
 */
export function bestAssignment(def: SignDefinition, left: HandFeatures, right: HandFeatures) {
  const [a, b] = def.shapes;
  const t = def.tolerance;
  const s1 = softMin([handShapeScore(left, a, t), handShapeScore(right, b, t)]);
  if (a === b) return { score: s1, left: a, right: b };
  const s2 = softMin([handShapeScore(left, b, t), handShapeScore(right, a, t)]);
  return s1 >= s2 ? { score: s1, left: a, right: b } : { score: s2, left: b, right: a };
}

export function scoreSign(def: SignDefinition, f: FrameFeatures): SignScore {
  if (f.hands.length < def.requiredHands) return { sign: def.id, confidence: 0, assignment: null };
  const [left, right] = f.hands;
  const asg = bestAssignment(def, left, right);
  const confidence =
    asg.score * distanceFactor(def, f.handDistance) * orientationFactor(def, f.hands) * stackFactor(def, left, right, asg);
  return { sign: def.id, confidence, assignment: { left: asg.left, right: asg.right } };
}
