/**
 * Draws the tracked hand skeleton on a canvas on top of the (mirrored) video.
 * Called once per camera frame directly from the tracking loop — no React.
 */
import type { FrameFeatures, HandFeatures, Vec2 } from "@/types/gestures";
import type { OverlayState } from "@/lib/game/session";
import { FINGER_JOINTS, HAND_CONNECTIONS } from "./gestureFeatures";

const TONES: Record<OverlayState["tone"], { line: string; joint: string; glow: string }> = {
  idle: { line: "rgba(160, 230, 255, 0.85)", joint: "#e8f8ff", glow: "rgba(80, 200, 255, 0.9)" },
  good: { line: "rgba(255, 200, 90, 0.95)", joint: "#fff4d6", glow: "rgba(255, 170, 40, 1)" },
  hint: { line: "rgba(255, 196, 64, 0.9)", joint: "#fff0c2", glow: "rgba(255, 180, 0, 0.9)" },
  error: { line: "rgba(255, 70, 70, 0.95)", joint: "#ffd6d6", glow: "rgba(255, 30, 30, 1)" },
};
const HIGHLIGHT = "#ff3b3b";

export interface OverlayExtras {
  /** Progress 0..1 of the seal currently being held (drawn as a ring between the hands). */
  hold: number;
  holdTone: "good" | "neutral";
}

export function drawOverlay(canvas: HTMLCanvasElement, video: HTMLVideoElement | null, f: FrameFeatures, overlay: OverlayState, extras: OverlayExtras) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);

  // Match the video's object-fit: cover crop.
  const vw = video?.videoWidth || f.aspect * 1000;
  const vh = video?.videoHeight || 1000;
  const s = Math.max(W / vw, H / vh);
  const dw = vw * s;
  const dh = vh * s;
  const ox = (W - dw) / 2;
  const oy = (H - dh) / 2;
  const map = (p: Vec2) => ({ x: ox + (p.x / f.aspect) * dw, y: oy + p.y * dh });

  const tone = TONES[overlay.tone];
  for (const hand of f.hands) drawHand(ctx, hand, map, tone, overlay, dw);

  // Charging ring between the hands while a seal is being held.
  if (f.hands.length === 2 && extras.hold > 0) {
    const a = map(f.hands[0].center);
    const b = map(f.hands[1].center);
    const cx = (a.x + b.x) / 2;
    const cy = Math.min(a.y, b.y) - 0.06 * dh;
    const r = Math.max(18, 0.045 * dh);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = extras.holdTone === "good" ? "#ffb347" : "rgba(170,220,255,0.9)";
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * extras.hold);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

function drawHand(
  ctx: CanvasRenderingContext2D,
  hand: HandFeatures,
  map: (p: Vec2) => Vec2,
  tone: (typeof TONES)[keyof typeof TONES],
  overlay: OverlayState,
  scale: number,
) {
  const pts = hand.screen.map(map);
  const hl = overlay.highlight;
  const handHighlighted = !!hl && !hl.finger && (hl.side === "both" || hl.side === hand.side);
  const fingerJoints = hl?.finger && (hl.side === "both" || hl.side === hand.side) ? new Set(FINGER_JOINTS[hl.finger]) : null;
  const lw = Math.max(2, scale * 0.004);

  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowColor = handHighlighted ? HIGHLIGHT : tone.glow;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = handHighlighted ? HIGHLIGHT : tone.line;
  ctx.lineWidth = lw;
  ctx.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    if (fingerJoints && fingerJoints.has(a) && fingerJoints.has(b)) continue;
    ctx.moveTo(pts[a].x, pts[a].y);
    ctx.lineTo(pts[b].x, pts[b].y);
  }
  ctx.stroke();

  // Offending finger drawn thick, red and pulsing.
  if (fingerJoints) {
    const j = [...fingerJoints];
    const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 110);
    ctx.shadowColor = HIGHLIGHT;
    ctx.shadowBlur = 22 * pulse;
    ctx.strokeStyle = HIGHLIGHT;
    ctx.lineWidth = lw * 2.4;
    ctx.beginPath();
    ctx.moveTo(pts[j[0]].x, pts[j[0]].y);
    for (const i of j.slice(1)) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }

  ctx.shadowBlur = 8;
  for (let i = 0; i < pts.length; i++) {
    const tip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
    const isHl = fingerJoints?.has(i) || handHighlighted;
    ctx.fillStyle = isHl ? HIGHLIGHT : tone.joint;
    ctx.beginPath();
    ctx.arc(pts[i].x, pts[i].y, (tip ? 1.5 : 1) * lw * (isHl ? 1.6 : 1.1), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Side tag under the wrist.
  const w = pts[0];
  ctx.font = `600 ${Math.max(11, scale * 0.014)}px Rajdhani, system-ui, sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillText(hand.side === "left" ? "L" : "R", w.x, w.y + lw * 7);
}
