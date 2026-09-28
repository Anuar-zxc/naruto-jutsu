/**
 * The seal vocabulary.
 *
 * Every seal is a PAIR of hand shapes plus optional relational constraints
 * (how far apart the hands are, which way the fingers point). The pairs were
 * chosen so that every seal differs from every other one in at least one
 * clearly visible feature — which is what makes rule-based classification
 * reliable, and what gives the correction engine something concrete to say.
 */
import type { HandShape, HandShapeId, SignDefinition, SignId } from "@/types/gestures";

export const HAND_SHAPES: Record<HandShapeId, HandShape> = {
  FIST: { id: "FIST", label: "fist", fingers: { index: 0, middle: 0, ring: 0, pinky: 0 } },
  OPEN: { id: "OPEN", label: "open palm", fingers: { index: 1, middle: 1, ring: 1, pinky: 1 } },
  INDEX: { id: "INDEX", label: "index finger up", fingers: { index: 1, middle: 0, ring: 0, pinky: 0 } },
  PEACE: { id: "PEACE", label: "index + middle up", fingers: { index: 1, middle: 1, ring: 0, pinky: 0 } },
  HORNS: { id: "HORNS", label: "index + pinky up", fingers: { index: 1, middle: 0, ring: 0, pinky: 1 } },
};

/** Hands closer than this (palm lengths between palm centres) count as "together". */
export const CLOSE_MAX = 2.6;
/** Hands further apart than this count as "spread wide". */
export const WIDE_MIN = 3.4;

const DEFAULT_RULES: SignDefinition["correctionRules"] = ["hands", "size", "shape", "fingers", "distance", "orientation"];

export const SIGNS: Record<SignId, SignDefinition> = {
  TIGER: {
    id: "TIGER",
    kanji: "寅",
    name: "Tiger",
    howTo: "Both hands: index + middle fingers up, hands together",
    requiredHands: 2,
    shapes: ["PEACE", "PEACE"],
    distance: { max: CLOSE_MAX },
    pointUp: true,
    tolerance: 0.45,
    threshold: 0.66,
    correctionRules: DEFAULT_RULES,
  },
  RAM: {
    id: "RAM",
    kanji: "未",
    name: "Ram",
    howTo: "Both hands: only index fingers up, pointing to the sky",
    requiredHands: 2,
    shapes: ["INDEX", "INDEX"],
    pointUp: true,
    tolerance: 0.45,
    threshold: 0.66,
    correctionRules: DEFAULT_RULES,
  },
  SNAKE: {
    id: "SNAKE",
    kanji: "巳",
    name: "Snake",
    howTo: "Two fists pressed close together",
    requiredHands: 2,
    shapes: ["FIST", "FIST"],
    distance: { max: CLOSE_MAX },
    tolerance: 0.45,
    threshold: 0.66,
    correctionRules: DEFAULT_RULES,
  },
  HORSE: {
    id: "HORSE",
    kanji: "午",
    name: "Horse",
    howTo: "Both palms open, hands side by side",
    requiredHands: 2,
    shapes: ["OPEN", "OPEN"],
    distance: { max: CLOSE_MAX },
    tolerance: 0.45,
    threshold: 0.66,
    correctionRules: DEFAULT_RULES,
  },
  MONKEY: {
    id: "MONKEY",
    kanji: "申",
    name: "Monkey",
    howTo: "Both palms open, arms spread wide apart",
    requiredHands: 2,
    shapes: ["OPEN", "OPEN"],
    distance: { min: WIDE_MIN },
    tolerance: 0.45,
    threshold: 0.66,
    correctionRules: DEFAULT_RULES,
  },
  DRAGON: {
    id: "DRAGON",
    kanji: "辰",
    name: "Dragon",
    howTo: "Both hands: horns — index + pinky up, others folded",
    requiredHands: 2,
    shapes: ["HORNS", "HORNS"],
    tolerance: 0.45,
    threshold: 0.64,
    correctionRules: DEFAULT_RULES,
  },
  OX: {
    id: "OX",
    kanji: "丑",
    name: "Ox",
    howTo: "One open palm, one fist",
    requiredHands: 2,
    shapes: ["OPEN", "FIST"],
    tolerance: 0.45,
    threshold: 0.66,
    correctionRules: DEFAULT_RULES,
  },
  BIRD: {
    id: "BIRD",
    kanji: "酉",
    name: "Bird",
    howTo: "One open palm, one index finger up",
    requiredHands: 2,
    shapes: ["OPEN", "INDEX"],
    tolerance: 0.45,
    threshold: 0.66,
    correctionRules: DEFAULT_RULES,
  },
};

export const SIGN_LIST: SignDefinition[] = Object.values(SIGNS);
