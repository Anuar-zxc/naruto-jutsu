/**
 * Synthetic hand generator.
 *
 * Builds anatomically plausible 21-point hands (same layout as MediaPipe) with a
 * given per-finger curl, position, size and tilt. Used by:
 *   - the unit tests (to verify every seal and every correction path), and
 *   - the hidden developer input mode (?synthetic=1) that lets you exercise the
 *     full pipeline without a camera. The real game always uses the webcam.
 */
import type { FingerName, HandShapeId, HandSide, RawFrame, RawHand, SignId, Vec2, Vec3 } from "@/types/gestures";
import { HAND_SHAPES, SIGNS } from "./gestureDefinitions";

export type Curls = Record<FingerName, number>;

export interface SyntheticHandSpec {
  side: HandSide;
  /** Curl per finger: 0 = straight, 1 = fully folded. */
  curls: Curls;
  /** Palm centre in mirrored screen coords (x in [0, aspect], y in [0, 1]). */
  center: Vec2;
  /** Palm length (wrist → middle knuckle) in screen units. */
  palm?: number;
  /** Degrees from straight up; + tilts toward screen-right. */
  tilt?: number;
  /** Landmark jitter amplitude in metres. */
  noise?: number;
}

const MCP: Record<Exclude<FingerName, "thumb">, [number, number]> = {
  index: [-0.03, 0.085],
  middle: [-0.008, 0.09],
  ring: [0.013, 0.085],
  pinky: [0.032, 0.075],
};
const BONES: Record<Exclude<FingerName, "thumb">, [number, number, number]> = {
  index: [0.04, 0.025, 0.021],
  middle: [0.044, 0.028, 0.022],
  ring: [0.041, 0.026, 0.021],
  pinky: [0.033, 0.02, 0.018],
};

const deg = (d: number) => (d * Math.PI) / 180;

function rotX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
}
const add = (a: Vec3, b: Vec3, k = 1): Vec3 => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const norm = (v: Vec3): Vec3 => {
  const l = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / l, y: v.y / l, z: v.z / l };
};

/** Seeded PRNG so tests are deterministic. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) / 4294967296) * 2 - 1;
  };
}

/** Local hand model: wrist at origin, fingers along +y, palm facing the camera (+z). */
function localHand(curls: Curls): Vec3[] {
  const pts: Vec3[] = new Array(21);
  pts[0] = { x: 0, y: 0, z: 0 };

  // Thumb: from the base of the palm, up and out; curling swings it across the palm.
  const tc = curls.thumb;
  let p: Vec3 = { x: -0.022, y: 0.022, z: 0.008 };
  pts[1] = p;
  const tDir0 = norm({ x: -0.7 + 1.3 * tc, y: 0.7 - 0.3 * tc, z: 0.15 + 0.35 * tc });
  const thumbBend = [0, 35 * tc, 45 * tc];
  const tLens = [0.035, 0.03, 0.025];
  let d = tDir0;
  for (let i = 0; i < 3; i++) {
    d = norm(add(d, { x: 0.4, y: -0.1, z: 0.3 }, Math.sin(deg(thumbBend[i]))));
    p = add(p, d, tLens[i]);
    pts[2 + i] = p;
  }

  (["index", "middle", "ring", "pinky"] as const).forEach((f, fi) => {
    const base = 5 + fi * 4;
    const [mx, my] = MCP[f];
    let q: Vec3 = { x: mx, y: my, z: 0 };
    pts[base] = q;
    const c = curls[f];
    let dir = norm({ x: mx * 0.6, y: 1, z: 0 });
    const bends = [75 * c, 100 * c, 55 * c];
    BONES[f].forEach((L, bi) => {
      dir = norm(rotX(dir, deg(bends[bi])));
      q = add(q, dir, L);
      pts[base + 1 + bi] = q;
    });
  });
  return pts;
}

export function syntheticHand(spec: SyntheticHandSpec, aspect: number, seed = 1): RawHand {
  const palm = spec.palm ?? 0.15;
  const tilt = deg(spec.tilt ?? 0);
  const k = palm / 0.0903; // local wrist→middle MCP length ≈ 0.0903 m
  const r = rng(seed);
  const n = spec.noise ?? 0;

  const local = localHand(spec.curls).map((v) => {
    const m = spec.side === "left" ? { ...v, x: -v.x } : v;
    return n ? { x: m.x + r() * n, y: m.y + r() * n, z: m.z + r() * n } : m;
  });

  // Rotate in the screen plane (x right, y up), then map to screen (y down).
  const rotated = local.map((v) => ({
    x: v.x * Math.cos(tilt) + v.y * Math.sin(tilt),
    y: -v.x * Math.sin(tilt) + v.y * Math.cos(tilt),
    z: v.z,
  }));
  const idx = [0, 5, 9, 17];
  const cx = idx.reduce((s, i) => s + rotated[i].x, 0) / 4;
  const cy = idx.reduce((s, i) => s + rotated[i].y, 0) / 4;

  const landmarks: Vec3[] = rotated.map((v) => {
    const sx = spec.center.x + (v.x - cx) * k;
    const sy = spec.center.y - (v.y - cy) * k;
    return { x: 1 - sx / aspect, y: sy, z: -v.z * k };
  });
  // World landmarks follow raw-image axes (x right in the un-mirrored frame, y down), metres.
  const world: Vec3[] = rotated.map((v) => ({ x: -(v.x - cx), y: -(v.y - cy), z: -v.z }));
  return { landmarks, world, score: 0.97 };
}

export function curlsForShape(shape: HandShapeId, thumbCurl = 0.6): Curls {
  const f = HAND_SHAPES[shape].fingers;
  const c = (on: 0 | 1) => (on ? 0.04 : 1);
  return { thumb: thumbCurl, index: c(f.index), middle: c(f.middle), ring: c(f.ring), pinky: c(f.pinky) };
}

export interface PoseOptions {
  aspect?: number;
  /** Palm-centre distance in palm lengths (horizontal). */
  distance?: number;
  /** Vertical offset in palm lengths: how far the FIRST shape's hand sits above the other. */
  dy?: number;
  palm?: number;
  tilt?: { left?: number; right?: number };
  /** Per-hand curl overrides, e.g. { right: { middle: 0.9 } }. */
  override?: { left?: Partial<Curls>; right?: Partial<Curls> };
  /** Swap which hand gets which shape (asymmetric seals). */
  swap?: boolean;
  noise?: number;
  /** Only render these sides (e.g. ["right"] to simulate a missing hand). */
  only?: HandSide[];
  cy?: number;
}

/** Two synthetic hands forming `sign` (optionally with deliberate mistakes). */
export function poseForSign(sign: SignId, o: PoseOptions = {}): SyntheticHandSpec[] {
  const def = SIGNS[sign];
  const aspect = o.aspect ?? 16 / 9;
  const palm = o.palm ?? 0.15;
  const stacked = def.stack === "topFirst";
  const distance = o.distance ?? (stacked ? 0.6 : def.distance?.max != null ? 1.4 : 2.0);
  const dy = o.dy ?? (stacked ? 1.6 : 0);
  const [a, b] = o.swap ? [def.shapes[1], def.shapes[0]] : def.shapes;
  const half = (distance * palm) / 2;
  const cx = aspect / 2;
  const cy = o.cy ?? 0.55;
  // Hand with the FIRST shape of the definition goes up by dy/2 palms, the other down.
  const firstIsLeft = !o.swap;
  const yLeft = cy + (firstIsLeft ? -1 : 1) * (dy * palm) / 2;
  const yRight = cy + (firstIsLeft ? 1 : -1) * (dy * palm) / 2;
  const down = def.pointDown;
  const specs: SyntheticHandSpec[] = [
    { side: "left", curls: { ...curlsForShape(a), ...o.override?.left }, center: { x: cx - half, y: yLeft }, palm, tilt: o.tilt?.left ?? (down ? 174 : -6), noise: o.noise },
    { side: "right", curls: { ...curlsForShape(b), ...o.override?.right }, center: { x: cx + half, y: yRight }, palm, tilt: o.tilt?.right ?? (down ? -174 : 6), noise: o.noise },
  ];
  return o.only ? specs.filter((s) => o.only!.includes(s.side)) : specs;
}

export function syntheticFrame(specs: SyntheticHandSpec[], t: number, aspect = 16 / 9, seed = 1): RawFrame {
  return { hands: specs.map((s, i) => syntheticHand(s, aspect, seed + i * 7919)), aspect, t };
}
