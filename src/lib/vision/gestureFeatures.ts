/**
 * Feature extraction: raw MediaPipe landmarks → normalised, user-independent features.
 *
 * - Finger extension is computed from JOINT ANGLES on the 3D world landmarks, so
 *   it does not depend on hand size, distance from camera or in-plane rotation.
 * - Hand position / distance use mirrored, aspect-corrected screen coordinates and
 *   are expressed in PALM LENGTHS, so "hands close together" means the same thing
 *   for a child 40 cm from the camera and an adult 1.5 m away.
 */
import type {
  FingerName,
  FrameFeatures,
  HandFeatures,
  HandSide,
  RawFrame,
  RawHand,
  Vec2,
  Vec3,
} from "@/types/gestures";

/** MediaPipe hand landmark indices. */
export const LM = {
  WRIST: 0,
  THUMB: [1, 2, 3, 4],
  INDEX: [5, 6, 7, 8],
  MIDDLE: [9, 10, 11, 12],
  RING: [13, 14, 15, 16],
  PINKY: [17, 18, 19, 20],
} as const;

export const FINGER_JOINTS: Record<FingerName, readonly number[]> = {
  thumb: LM.THUMB,
  index: LM.INDEX,
  middle: LM.MIDDLE,
  ring: LM.RING,
  pinky: LM.PINKY,
};

/** Skeleton edges for drawing. */
export const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [0, 17], [17, 18], [18, 19], [19, 20],
];

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Vec3) => Math.sqrt(dot(a, a));

/** Angle in degrees between two 3D vectors (0 = same direction). */
export function angleBetween(a: Vec3, b: Vec3): number {
  const la = len(a);
  const lb = len(b);
  if (la < 1e-9 || lb < 1e-9) return 0;
  const c = Math.min(1, Math.max(-1, dot(a, b) / (la * lb)));
  return (Math.acos(c) * 180) / Math.PI;
}

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** Total bend (deg) along a long finger: wrist→MCP→PIP→DIP→TIP. */
export function fingerBend(world: Vec3[], finger: FingerName): number {
  const [mcp, pip, dip, tip] = FINGER_JOINTS[finger].map((i) => world[i]);
  const wrist = world[LM.WRIST];
  if (finger === "thumb") {
    // Thumb: bend at MCP and IP only; base direction from CMC.
    return angleBetween(sub(pip, mcp), sub(dip, pip)) + angleBetween(sub(dip, pip), sub(tip, dip));
  }
  return (
    angleBetween(sub(mcp, wrist), sub(pip, mcp)) +
    angleBetween(sub(pip, mcp), sub(dip, pip)) +
    angleBetween(sub(dip, pip), sub(tip, dip))
  );
}

/**
 * Map total bend to an extension score.
 * A relaxed straight finger bends ~20–50°, a fist ~220–260°.
 */
const STRAIGHT_BEND = 55;
const CURLED_BEND = 185;
const THUMB_STRAIGHT = 25;
const THUMB_CURLED = 100;

export function bendToExtension(bend: number, finger: FingerName): number {
  if (finger === "thumb") return clamp01((THUMB_CURLED - bend) / (THUMB_CURLED - THUMB_STRAIGHT));
  return clamp01((CURLED_BEND - bend) / (CURLED_BEND - STRAIGHT_BEND));
}

/** Raw normalised landmark → mirrored, aspect-corrected screen point. */
export function toScreen(p: Vec3, aspect: number): Vec2 {
  return { x: (1 - p.x) * aspect, y: p.y };
}

export function extractHand(hand: RawHand, aspect: number): Omit<HandFeatures, "side"> {
  const screen = hand.landmarks.map((p) => toScreen(p, aspect));
  const wrist = screen[LM.WRIST];
  const midMcp = screen[LM.MIDDLE[0]];
  const idxMcp = screen[LM.INDEX[0]];
  const pinkyMcp = screen[LM.PINKY[0]];

  const center: Vec2 = {
    x: (wrist.x + idxMcp.x + pinkyMcp.x + midMcp.x) / 4,
    y: (wrist.y + idxMcp.y + pinkyMcp.y + midMcp.y) / 4,
  };
  const size = Math.hypot(midMcp.x - wrist.x, midMcp.y - wrist.y);
  // y grows downward, so "up" is -y.
  const pointing = (Math.atan2(midMcp.x - wrist.x, -(midMcp.y - wrist.y)) * 180) / Math.PI;

  const ext = {} as Record<FingerName, number>;
  for (const f of ["thumb", "index", "middle", "ring", "pinky"] as FingerName[]) {
    ext[f] = bendToExtension(fingerBend(hand.world, f), f);
  }
  return { ext, center, size, pointing, score: hand.score, screen };
}

/**
 * Assign player sides. With two hands, the one further right on the mirrored
 * screen is the player's right hand. With one hand we use which half of the
 * frame it is in. (MediaPipe's own handedness label flips depending on
 * mirroring conventions, so we deliberately do not rely on it.)
 */
export function extractFrame(frame: RawFrame): FrameFeatures {
  const hands = frame.hands
    .filter((h) => h.landmarks.length === 21 && h.world.length === 21)
    .slice(0, 2)
    .map((h) => extractHand(h, frame.aspect))
    .sort((a, b) => a.center.x - b.center.x);

  const withSides: HandFeatures[] = hands.map((h, i) => {
    let side: HandSide;
    if (hands.length === 2) side = i === 0 ? "left" : "right";
    else side = h.center.x < frame.aspect / 2 ? "left" : "right";
    return { ...h, side };
  });

  let handDistance: number | null = null;
  if (withSides.length === 2) {
    const [a, b] = withSides;
    const palm = (a.size + b.size) / 2;
    handDistance = palm > 1e-6 ? Math.hypot(a.center.x - b.center.x, a.center.y - b.center.y) / palm : null;
  }

  return { t: frame.t, aspect: frame.aspect, hands: withSides, handDistance };
}

/**
 * Exponential smoothing of per-finger extension and geometry, keyed by side.
 * Removes landmark jitter without adding much latency.
 */
export class FeatureSmoother {
  private prev = new Map<HandSide, HandFeatures>();
  private prevDistance: number | null = null;

  constructor(private alpha = 0.5) {}

  reset() {
    this.prev.clear();
    this.prevDistance = null;
  }

  smooth(f: FrameFeatures): FrameFeatures {
    const a = this.alpha;
    const hands = f.hands.map((h) => {
      const p = this.prev.get(h.side);
      if (!p) return h;
      const ext = {} as Record<FingerName, number>;
      for (const k of Object.keys(h.ext) as FingerName[]) ext[k] = a * h.ext[k] + (1 - a) * p.ext[k];
      // Angles: avoid averaging across the ±180 wrap.
      let dp = h.pointing - p.pointing;
      if (dp > 180) dp -= 360;
      if (dp < -180) dp += 360;
      return {
        ...h,
        ext,
        size: a * h.size + (1 - a) * p.size,
        pointing: p.pointing + a * dp,
      };
    });
    this.prev.clear();
    for (const h of hands) this.prev.set(h.side, h);

    let handDistance = f.handDistance;
    if (handDistance != null && this.prevDistance != null) {
      handDistance = a * handDistance + (1 - a) * this.prevDistance;
    }
    this.prevDistance = handDistance;
    return { ...f, hands, handDistance };
  }
}
