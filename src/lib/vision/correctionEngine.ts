/**
 * ERROR MODE — the correction engine.
 *
 * Given the seal the player SHOULD be making and the current hand features,
 * find every concrete deviation (missing hand, wrong finger, hands too far,
 * wrong height, hand tilted), score how severe each one is, and return ONLY the
 * most useful one as a short imperative instruction — in Russian and English.
 *
 * Rules are inspected in the order given by the seal's `correctionRules`, and
 * within the finger rule the largest deviation wins. Deviations that affect
 * both hands the same way are merged into one plural message
 * ("Extend your index fingers" / "Выпрями указательные пальцы на обеих руках").
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
import type { L } from "@/types/i18n";
import { LONG_FINGERS } from "@/types/gestures";
import { HAND_SHAPES } from "./gestureDefinitions";
import { bestAssignment, distanceFactor, heightAbove, orientationFactor, stackFactor } from "./gestureScoring";

/** Palm length (fraction of frame height) below which the hand is too small to read well. */
export const MIN_PALM_SIZE = 0.06;

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

// ---------------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------------

const SIDE = {
  en: { left: "left", right: "right" },
  /** genitive: "… левой руки" */
  ruGen: { left: "левой руки", right: "правой руки" },
  /** accusative: "левую руку" */
  ruAcc: { left: "левую руку", right: "правую руку" },
  /** nominative, capitalised: "Левая рука" */
  ruNom: { left: "Левая рука", right: "Правая рука" },
};

const FINGER = {
  en: { index: "index finger", middle: "middle finger", ring: "ring finger", pinky: "pinky" },
  enPl: { index: "index fingers", middle: "middle fingers", ring: "ring fingers", pinky: "pinkies" },
  ru: { index: "указательный палец", middle: "средний палец", ring: "безымянный палец", pinky: "мизинец" },
  ruPl: { index: "указательные пальцы", middle: "средние пальцы", ring: "безымянные пальцы", pinky: "мизинцы" },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function shapeText(side: HandSide, shape: HandShapeId): L {
  switch (shape) {
    case "FIST":
      return { en: `Close your ${side} hand into a fist.`, ru: `Сожми ${SIDE.ruAcc[side]} в кулак.` };
    case "OPEN":
      return { en: `Open your ${side} hand — spread all fingers.`, ru: `Раскрой ${SIDE.ruAcc[side]} — все пальцы врозь.` };
    case "INDEX":
      return { en: `${cap(side)} hand: only the index finger up.`, ru: `${SIDE.ruNom[side]}: подними только указательный палец.` };
    case "PEACE":
      return { en: `${cap(side)} hand: index and middle fingers up, fold the rest.`, ru: `${SIDE.ruNom[side]}: указательный и средний вверх, остальные согни.` };
    case "HORNS":
      return { en: `${cap(side)} hand: index and pinky up, fold the middle two.`, ru: `${SIDE.ruNom[side]}: указательный и мизинец вверх, средние согни.` };
    case "THREE":
      return { en: `${cap(side)} hand: three fingers up (index, middle, ring), fold the pinky.`, ru: `${SIDE.ruNom[side]}: три пальца вверх (указательный, средний, безымянный), мизинец согни.` };
  }
}

function bothShapeText(shape: HandShapeId): L {
  switch (shape) {
    case "FIST":
      return { en: "Close both hands into fists.", ru: "Сожми обе руки в кулаки." };
    case "OPEN":
      return { en: "Open both hands — spread your fingers.", ru: "Раскрой обе ладони — пальцы врозь." };
    case "INDEX":
      return { en: "Both hands: only index fingers up.", ru: "Обе руки: только указательные пальцы вверх." };
    case "PEACE":
      return { en: "Both hands: index and middle fingers up.", ru: "Обе руки: указательный и средний вверх." };
    case "HORNS":
      return { en: "Both hands: index and pinky up.", ru: "Обе руки: указательный и мизинец вверх." };
    case "THREE":
      return { en: "Both hands: three fingers up, pinkies folded.", ru: "Обе руки: три пальца вверх, мизинцы согнуты." };
  }
}

function fingerText(issue: FingerIssue, both: boolean): L {
  const f = issue.finger;
  if (both) {
    return issue.fix === "extend"
      ? { en: `Extend your ${FINGER.enPl[f]}.`, ru: `Выпрями ${FINGER.ruPl[f]} на обеих руках.` }
      : { en: `Fold down your ${FINGER.enPl[f]}.`, ru: `Согни ${FINGER.ruPl[f]} на обеих руках.` };
  }
  const side = issue.side;
  if (issue.fix === "extend") {
    return f === "index"
      ? { en: `Raise your ${side} index finger.`, ru: `Подними указательный палец ${SIDE.ruGen[side]}.` }
      : { en: `Straighten your ${side} ${FINGER.en[f]}.`, ru: `Выпрями ${FINGER.ru[f]} ${SIDE.ruGen[side]}.` };
  }
  return { en: `Close your ${side} ${FINGER.en[f]}.`, ru: `Согни ${FINGER.ru[f]} ${SIDE.ruGen[side]}.` };
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

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

function handsRule(def: SignDefinition, f: FrameFeatures): Correction | null {
  if (f.hands.length === 0) {
    return { key: "hands:none", kind: "hands", text: { en: "Move your hands into the frame.", ru: "Подними обе руки в кадр." } };
  }
  if (f.hands.length < def.requiredHands) {
    const missing: HandSide = f.hands[0].side === "left" ? "right" : "left";
    return {
      key: `hands:missing:${missing}`,
      kind: "hands",
      text: {
        en: `Show both hands — your ${missing} hand is out of view.`,
        ru: `Покажи обе руки — ${missing === "left" ? "левой" : "правой"} руки не видно.`,
      },
      highlight: { side: missing },
    };
  }
  return null;
}

function sizeRule(_def: SignDefinition, f: FrameFeatures): Correction | null {
  const smallest = Math.min(...f.hands.map((h) => h.size));
  if (smallest < MIN_PALM_SIZE) return { key: "size:small", kind: "size", text: { en: "Move closer to the camera.", ru: "Подойди ближе к камере." } };
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
      return { key: `shape:both:${s}`, kind: "shape", text: bothShapeText(s), highlight: { side: "both" } };
    }
    if (perHand.length > 0) {
      const { h, s } = perHand[0];
      return { key: `shape:${h.side}:${s}`, kind: "shape", text: shapeText(h.side, s), highlight: { side: h.side } };
    }
  }

  if (!kinds.has("fingers")) return null;
  issues.sort((a, b) => b.severity - a.severity);
  const worst = issues[0];
  const both = issues.some((i) => i !== worst && i.finger === worst.finger && i.fix === worst.fix);
  return {
    key: `finger:${both ? "both" : worst.side}:${worst.finger}:${worst.fix}`,
    kind: "fingers",
    text: fingerText(worst, both),
    highlight: { side: both ? "both" : worst.side, finger: worst.finger as FingerName },
  };
}

function distanceRule(def: SignDefinition, f: FrameFeatures): Correction | null {
  if (!def.distance || f.handDistance == null) return null;
  if (distanceFactor(def, f.handDistance) >= 0.85) return null;
  if (def.distance.max != null && f.handDistance > def.distance.max) {
    return {
      key: "distance:closer",
      kind: "distance",
      text: { en: "Bring your hands closer together.", ru: "Сведи руки ближе друг к другу." },
      highlight: { side: "both" },
    };
  }
  if (def.distance.min != null && f.handDistance < def.distance.min) {
    return { key: "distance:wider", kind: "distance", text: { en: "Spread your hands wider apart.", ru: "Разведи руки шире." }, highlight: { side: "both" } };
  }
  return null;
}

function stackRule(def: SignDefinition, f: FrameFeatures): Correction | null {
  if (!def.stack) return null;
  const [left, right] = f.hands;
  const asg = bestAssignment(def, left, right);
  if (stackFactor(def, left, right, asg) >= 0.85) return null;
  if (def.stack === "side") {
    return {
      key: "stack:side",
      kind: "stack",
      text: { en: "Hold your hands side by side, at the same height.", ru: "Держи руки рядом, на одной высоте." },
      highlight: { side: "both" },
    };
  }
  if (def.stack === "stacked") {
    return {
      key: "stack:stacked",
      kind: "stack",
      text: { en: "Stack your palms: hold one hand clearly ABOVE the other.", ru: "Сложи ладони ярусом: одна рука заметно ВЫШЕ другой." },
      highlight: { side: "both" },
    };
  }
  const [top, other] = asg.left === def.shapes[0] ? [left, right] : [right, left];
  const below = heightAbove(top, other) < 0;
  const topShape = HAND_SHAPES[def.shapes[0]].id === "OPEN" ? { en: "open palm", ru: "раскрытую ладонь" } : { en: "first hand", ru: "первую руку" };
  const otherShape = HAND_SHAPES[def.shapes[1]].id === "FIST" ? { en: "your fist", ru: "кулаком" } : { en: "the other hand", ru: "другой рукой" };
  return {
    key: `stack:top:${below ? "flip" : "raise"}`,
    kind: "stack",
    text: below
      ? { en: `Swap heights: put your ${topShape.en} ABOVE ${otherShape.en}.`, ru: `Поменяй руки по высоте: ${topShape.ru} — НАД ${otherShape.ru}.` }
      : { en: `Raise your ${topShape.en} higher, above ${otherShape.en}.`, ru: `Подними ${topShape.ru} выше, над ${otherShape.ru}.` },
    highlight: { side: top.side },
  };
}

function orientationRule(def: SignDefinition, f: FrameFeatures): Correction | null {
  if (!def.pointUp && !def.pointDown) return null;
  if (orientationFactor(def, f.hands) >= 0.85) return null;

  if (def.pointDown) {
    const worst = [...f.hands].sort((a, b) => Math.abs(a.pointing) - Math.abs(b.pointing))[0];
    return {
      key: `orient:${worst.side}:todown`,
      kind: "orientation",
      text: { en: "Point your fingers DOWN — turn your palms toward the floor.", ru: "Направь пальцы ВНИЗ — ладони к полу." },
      highlight: { side: worst.side },
    };
  }

  const worst = [...f.hands].sort((a, b) => Math.abs(b.pointing) - Math.abs(a.pointing))[0];
  const a = worst.pointing;
  if (Math.abs(a) >= 120) {
    return {
      key: `orient:${worst.side}:down`,
      kind: "orientation",
      text: { en: `Point your ${worst.side} fingers up to the sky.`, ru: `Направь пальцы ${SIDE.ruGen[worst.side]} вверх.` },
      highlight: { side: worst.side },
    };
  }
  // Positive angle = tilted toward screen-right. For the player's right hand that is
  // "outward"; for the left hand it is "inward" (toward the body centre).
  const tiltedRight = a > 0;
  const outward = worst.side === "right" ? tiltedRight : !tiltedRight;
  return {
    key: `orient:${worst.side}:${outward ? "in" : "out"}`,
    kind: "orientation",
    text: {
      en: `Rotate your ${worst.side} hand ${outward ? "inward" : "outward"} — fingers straight up.`,
      ru: `Поверни ${SIDE.ruAcc[worst.side]} ${outward ? "внутрь" : "наружу"} — пальцы строго вверх.`,
    },
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
    else if (kind === "stack") c = stackRule(def, f);
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
