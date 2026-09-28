/**
 * Core types for the vision pipeline.
 *
 * Coordinate conventions
 * ----------------------
 * - "raw" landmarks come straight from MediaPipe: x,y normalised to [0,1] of the
 *   UN-mirrored camera frame, y pointing down.
 * - "screen" coordinates are MIRRORED (what the player sees, like a mirror) and
 *   aspect-corrected: x in [0, aspect], y in [0, 1]. Using the same unit on both
 *   axes keeps distances and angles honest on 16:9 cameras.
 * - "left"/"right" always mean the PLAYER's left/right hand. In a mirrored view
 *   the player's right hand appears on the right side of the screen.
 */

import type { L } from "./i18n";

export type FingerName = "thumb" | "index" | "middle" | "ring" | "pinky";

/** The four long fingers used for classification (thumb is too ambiguous). */
export const LONG_FINGERS = ["index", "middle", "ring", "pinky"] as const;
export type LongFinger = (typeof LONG_FINGERS)[number];

export const ALL_FINGERS: readonly FingerName[] = ["thumb", "index", "middle", "ring", "pinky"];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

/** One detected hand as produced by a HandSource (MediaPipe or synthetic). */
export interface RawHand {
  /** 21 landmarks, raw normalised image coordinates (not mirrored). */
  landmarks: Vec3[];
  /** 21 landmarks in metric 3D space (MediaPipe world landmarks). */
  world: Vec3[];
  /** Detector presence score, 0..1. */
  score: number;
}

export interface RawFrame {
  hands: RawHand[];
  /** Video width / height. */
  aspect: number;
  /** performance.now() timestamp in ms. */
  t: number;
}

export type HandSide = "left" | "right";

export interface HandFeatures {
  side: HandSide;
  /** Extension per finger: 1 = fully straight, 0 = fully curled. */
  ext: Record<FingerName, number>;
  /** Palm centre in screen coordinates. */
  center: Vec2;
  /** Palm length (wrist → middle MCP) in screen units (fraction of frame height). */
  size: number;
  /**
   * Direction the hand points (wrist → middle knuckle), degrees from straight up.
   * 0 = fingers up, +90 = pointing to screen-right, ±180 = pointing down.
   */
  pointing: number;
  score: number;
  /** Mirrored screen-space landmarks, kept for drawing and debugging. */
  screen: Vec2[];
}

export interface FrameFeatures {
  t: number;
  aspect: number;
  /** Sorted left → right (player's left hand first). */
  hands: HandFeatures[];
  /** Distance between palm centres measured in palm lengths; null if < 2 hands. */
  handDistance: number | null;
}

/** The twelve zodiac hand seals. */
export type SignId =
  | "RAT"
  | "OX"
  | "TIGER"
  | "RABBIT"
  | "DRAGON"
  | "SNAKE"
  | "HORSE"
  | "RAM"
  | "MONKEY"
  | "BIRD"
  | "DOG"
  | "BOAR";

/** Per-hand finger configuration. Values: 1 = extended, 0 = curled. */
export type HandShapeId = "FIST" | "OPEN" | "INDEX" | "PEACE" | "HORNS";

export interface HandShape {
  id: HandShapeId;
  label: string;
  fingers: Record<LongFinger, 0 | 1>;
}

export type CorrectionRuleKind = "hands" | "size" | "shape" | "fingers" | "distance" | "stack" | "orientation";

export interface SignDefinition {
  id: SignId;
  /** Zodiac kanji used as the seal glyph. */
  kanji: string;
  name: L;
  /** Short player-facing instruction. */
  howTo: L;
  requiredHands: 2;
  /** Unordered pair: one hand makes shapes[0], the other shapes[1]. */
  shapes: [HandShapeId, HandShapeId];
  /** Palm-centre distance constraint in palm lengths. */
  distance?: { min?: number; max?: number };
  /** If true, extended fingers must point roughly upward. */
  pointUp?: boolean;
  /** If true, fingers must point downward. */
  pointDown?: boolean;
  /**
   * Vertical arrangement: "side" = hands at the same height,
   * "topFirst" = the hand making shapes[0] is ABOVE the other one.
   */
  stack?: "side" | "topFirst";
  /** How far (0..1) a finger's extension may drift from the ideal before it counts as wrong. */
  tolerance: number;
  /** Minimum confidence for this sign to be recognised. */
  threshold: number;
  /** Order in which the correction engine inspects problems for this sign. */
  correctionRules: CorrectionRuleKind[];
}

export interface SignScore {
  sign: SignId;
  confidence: number;
  /** Which hand got which shape (for asymmetric signs). */
  assignment: { left: HandShapeId; right: HandShapeId } | null;
}

export interface RecognitionFrame {
  features: FrameFeatures;
  scores: SignScore[];
  /** Best single-frame guess (null = UNKNOWN). */
  raw: { sign: SignId | null; confidence: number };
  /** Temporally stable sign (null = none). */
  stable: SignId | null;
  stableConfidence: number;
  /** Progress (0..1) of the candidate sign toward being accepted. */
  hold: { sign: SignId; progress: number } | null;
  /** Edge event: a sign was accepted on this exact frame. */
  accepted: SignId | null;
  fps: number;
}

export interface Correction {
  /** Stable key, used to debounce identical messages. */
  key: string;
  kind: CorrectionRuleKind;
  text: L;
  /** Which part of the skeleton to highlight on the overlay. */
  highlight?: { side: HandSide | "both"; finger?: FingerName };
}
