/**
 * ERROR MODE — the correction engine.
 *
 * Given the seal the player SHOULD be making and the current hand features,
 * find every concrete deviation (missing hand, wrong finger, hands too far,
 * hand tilted), score how severe each one is, and return ONLY the most useful
 * one as a short imperative instruction ("Straighten your right middle finger").
 *
 * Rules are inspected in the order given by the seal's `correctionRules`, and
 * within the finger rule the largest deviation wins. Deviations that affect
 * both hands the same way are merged into one plural message
 * ("Extend your index fingers").
 */
import type {
  Correction,
  FingerName,
  FrameFeatures,
  HandFeatures,
  HandShapeId,
  HandSide,
  LongFinger,
  SignDefinition,
} from "@/types/gestures";
import { LONG_FINGERS } from "@/types/gestures";
import { HAND_SHAPES } from "./gestureDefinitions";
import { bestAssignment, distanceFactor } from "./gestureScoring";

/** Palm length (fraction of frame height) below which the hand is too small to read well. */
export const MIN_PALM_SIZE = 0.075;

/** Extension thresholds used to decide a finger is clearly in the wrong state. */
const EXTENDED_OK = 0.55;
const CURLED_OK = 0.45;

interface FingerIssue {
  side: HandSide;
  finger: LongFinger;
  /** "extend" = should be straight but is bent, "curl" = should be folded but is straight. */
  fix: "extend" | "curl";
  severity: number;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function fingerIssues(hand: HandFeatures, shape: HandShapeId): FingerIssue[] {
  const target = HAND_SHAPES[shape].fingers;
  const out: FingerIssue[] = [];
  for (const f of LONG_FINGERS) {
    const v = hand.ext[f];
    if (target[f] === 1 && v < EXTENDED_OK) out.push({ side: hand.side, finger: f, fix: "extend", severity: EXTENDED_OK - v + 0.1 });
    if (target[f] === 0 && v > CURLED_OK) out.push({ side: hand.side, finger: f, fix: "curl", severity: v - CURLED_OK + 0.1 });
  }
  return out;
}

/** Whole-hand message when most of a hand is wrong — clearer than naming one finger. */
function shapeMessage(side: HandSide, shape: HandShapeId): string {
  switch (shape) {
    case "FIST":
      return `Close your ${side} hand into a fist.`;
    case "OPEN":
      return `Open your ${side} hand — spread all fingers.`;
    case "INDEX":
      return `${cap(side)} hand: only the index finger up.`;
    case "PEACE":
      return `${cap(side)} hand: index and middle fingers up, fold the rest.`;
    case "HORNS":
      return `${cap(side)} hand: index and pinky up, fold the middle two.`;
  }
}

function fingerMessage(issue: FingerIssue, both: boolean): string {
  const f = issue.finger === "pinky" ? "pinky" : `${issue.finger} finger`;
  if (both) {
    const plural = issue.finger === "pinky" ? "pinkies" : `${issue.finger} fingers`;
    return issue.fix === "extend" ? `Extend your ${plural}.` : `Fold down your ${plural}.`;
  }
  if (issue.fix === "extend") return issue.finger === "index" ? `Raise your ${issue.side} index finger.` : `Straighten your ${issue.side} ${f}.`;
  return `Close your ${issue.side} ${f}.`;
}

function handsRule(def: SignDefinition, f: FrameFeatures): Correction | null {
  if (f.hands.length === 0) return { key: "hands:none", kind: "hands", message: "Move your hands into the frame." };
  if (f.hands.length < def.requiredHands) {
    const missing: HandSide = f.hands[0].side === "left" ? "right" : "left";
    return {
      key: `hands:missing:${missing}`,
      kind: "hands",
      message: `Show both hands — your ${missing} hand is out of view.`,
      highlight: { side: missing },
    };
  }
  return null;
}

function sizeRule(_def: SignDefinition, f: FrameFeatures): Correction | null {
  const smallest = Math.min(...f.hands.map((h) => h.size));
  if (smallest < MIN_PALM_SIZE) return { key: "size:small", kind: "size", message: "Move closer to the camera." };
  return null;
}

function shapeAndFingerRules(def: SignDefinition, f: FrameFeatures, kinds: Set<string>): Correction | null {
  const [left, right] = f.hands;
  const asg = bestAssignment(def, left, right);
  const plan: [HandFeatures, HandShapeId][] = [
    [left, asg.left],
    [right, asg.right],
  ];
  const issues = plan.flatMap(([h, s]) => fingerIssues(h, s));
  if (issues.length === 0) return null;

  // Whole-hand problems first (≥3 wrong fingers on one hand).
  if (kinds.has("shape")) {
    const perHand = plan
      .map(([h, s]) => ({ h, s, n: issues.filter((i) => i.side === h.side).length }))
      .filter((x) => x.n >= 3)
      .sort((a, b) => b.n - a.n);
    if (perHand.length === 2 && perHand[0].s === perHand[1].s) {
      const s = perHand[0].s;
      const msg =
        s === "FIST" ? "Close both hands into fists." : s === "OPEN" ? "Open both hands — spread your fingers." : `Both hands: ${HAND_SHAPES[s].label}.`;
      return { key: `shape:both:${s}`, kind: "shape", message: msg, highlight: { side: "both" } };
    }
    if (perHand.length > 0) {
      const { h, s } = perHand[0];
      return { key: `shape:${h.side}:${s}`, kind: "shape", message: shapeMessage(h.side, s), highlight: { side: h.side } };
    }
  }

  if (!kinds.has("fingers")) return null;
  issues.sort((a, b) => b.severity - a.severity);
  const worst = issues[0];
  const twin = issues.find((i) => i !== worst && i.finger === worst.finger && i.fix === worst.fix);
  const both = !!twin;
  return {
    key: `finger:${both ? "both" : worst.side}:${worst.finger}:${worst.fix}`,
    kind: "fingers",
    message: fingerMessage(worst, both),
    highlight: { side: both ? "both" : worst.side, finger: worst.finger as FingerName },
  };
}

function distanceRule(def: SignDefinition, f: FrameFeatures): Correction | null {
  if (!def.distance || f.handDistance == null) return null;
  if (distanceFactor(def, f.handDistance) >= 0.85) return null;
  if (def.distance.max != null && f.handDistance > def.distance.max) {
    return { key: "distance:closer", kind: "distance", message: "Bring your hands closer together.", highlight: { side: "both" } };
  }
  if (def.distance.min != null && f.handDistance < def.distance.min) {
    return { key: "distance:wider", kind: "distance", message: "Spread your hands wider apart.", highlight: { side: "both" } };
  }
  return null;
}

function orientationRule(def: SignDefinition, f: FrameFeatures): Correction | null {
  if (!def.pointUp) return null;
  // Worst-tilted hand.
  const worst = [...f.hands].sort((a, b) => Math.abs(b.pointing) - Math.abs(a.pointing))[0];
  const a = worst.pointing;
  if (Math.abs(a) <= 45) return null;
  if (Math.abs(a) >= 120) {
    return { key: `orient:${worst.side}:down`, kind: "orientation", message: `Point your ${worst.side} fingers up to the sky.`, highlight: { side: worst.side } };
  }
  // Positive angle = tilted toward screen-right. For the player's right hand that is
  // "outward"; for the left hand it is "inward" (toward the body centre).
  const tiltedRight = a > 0;
  const outward = worst.side === "right" ? tiltedRight : !tiltedRight;
  return {
    key: `orient:${worst.side}:${outward ? "in" : "out"}`,
    kind: "orientation",
    message: `Rotate your ${worst.side} hand ${outward ? "inward" : "outward"} — fingers straight up.`,
    highlight: { side: worst.side },
  };
}

/**
 * Most relevant single correction for `def`, or null if the pose already
 * satisfies every rule.
 */
export function getCorrection(def: SignDefinition, f: FrameFeatures): Correction | null {
  const kinds = new Set<string>(def.correctionRules);
  const h = kinds.has("hands") ? handsRule(def, f) : null;
  if (h) return h;
  if (f.hands.length < 2) return null;

  for (const kind of def.correctionRules) {
    let c: Correction | null = null;
    if (kind === "size") c = sizeRule(def, f);
    else if (kind === "shape" || kind === "fingers") c = shapeAndFingerRules(def, f, kinds);
    else if (kind === "distance") c = distanceRule(def, f);
    else if (kind === "orientation") c = orientationRule(def, f);
    if (c) return c;
  }
  return null;
}

/**
 * Debounces corrections so the HUD never flickers between messages: a new
 * message must persist for `minFrames` consecutive frames before it replaces
 * the one on screen, and a shown message stays for at least `minShowMs`.
 */
export class CorrectionStabilizer {
  private shown: Correction | null = null;
  private shownAt = 0;
  private pending: Correction | null = null;
  private pendingCount = 0;

  constructor(private minFrames = 6, private minShowMs = 900) {}

  reset() {
    this.shown = null;
    this.pending = null;
    this.pendingCount = 0;
  }

  /** Show `c` immediately (used when a mistake is counted and the message must match NOW). */
  force(c: Correction | null, t: number): Correction | null {
    this.shown = c;
    this.shownAt = t;
    this.pending = null;
    this.pendingCount = 0;
    return c;
  }

  update(c: Correction | null, t: number): Correction | null {
    const key = c?.key ?? null;
    if (key === (this.shown?.key ?? null)) {
      this.pending = null;
      this.pendingCount = 0;
      if (c) this.shown = c;
      return this.shown;
    }
    if (key === (this.pending?.key ?? null)) this.pendingCount++;
    else {
      this.pending = c;
      this.pendingCount = 1;
    }
    const canSwap = t - this.shownAt >= this.minShowMs || this.shown === null;
    if (this.pendingCount >= this.minFrames && canSwap) {
      this.shown = this.pending;
      this.shownAt = t;
      this.pending = null;
      this.pendingCount = 0;
    }
    return this.shown;
  }
}
