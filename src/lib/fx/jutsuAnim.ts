/**
 * Signature animation for every jutsu, staged between the two fighters of the
 * fighting-game arena: Rasengan dash, Chidori's crackle-and-pierce, a real
 * fireball, a water dragon, shadow clones, a summoned toad and so on.
 *
 * Canvas work goes through FxEngine; sprites/clones/props are small DOM nodes
 * in `layer`. Every animation calls `onHit` exactly once, at impactMs(id).
 */
import type { JutsuId } from "@/types/game";
import { FxEngine, PALETTE, jagged } from "./fxEngine";
import { impactMs } from "@/lib/game/jutsu";

export interface Pt {
  x: number;
  y: number;
}

export interface CastScene {
  fx: FxEngine;
  /** Absolutely positioned full-screen container for DOM props. */
  layer: HTMLElement | null;
  hero: HTMLElement | null;
  foe: HTMLElement | null;
  heroImg?: string;
  onHit: () => void;
  whoosh?: () => void;
  poof?: () => void;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
/** Local progress of `k` inside the window [a, b]. */
const win = (k: number, a: number, b: number) => clamp01((k - a) / (b - a));

export function point(el: HTMLElement | null, fx = 0.5, fy = 0.5): Pt {
  const r = el?.getBoundingClientRect();
  if (!r || !r.width) return { x: window.innerWidth * (fx < 0.5 ? 0.25 : 0.75), y: window.innerHeight * 0.5 };
  return { x: r.left + r.width * fx, y: r.top + r.height * fy };
}

/** Restartable CSS class pulse on a sprite (dash, knockback, vanish…). */
export function pulse(el: HTMLElement | null, cls: string, ms: number, vars?: Record<string, string>) {
  if (!el) return;
  if (vars) for (const [k, v] of Object.entries(vars)) el.style.setProperty(k, v);
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), ms);
}

function prop(layer: HTMLElement | null, cls: string, at: Pt, html = ""): HTMLElement | null {
  if (!layer) return null;
  const d = document.createElement("div");
  d.className = `jfx ${cls}`;
  d.style.left = `${at.x}px`;
  d.style.top = `${at.y}px`;
  d.innerHTML = html;
  layer.appendChild(d);
  return d;
}

const later = (ms: number, f: () => void) => window.setTimeout(f, ms);

/** Spinning chakra sphere (Rasengan core). */
function swirl(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number, c = PALETTE.chakra) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.3, c[1]);
  g.addColorStop(0.6, c[3]);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    const a = now / (70 + i * 9) + (i * Math.PI * 2) / 7;
    ctx.strokeStyle = i % 2 ? c[0] : c[2];
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = Math.max(1, r * 0.09);
    ctx.beginPath();
    ctx.ellipse(x, y, r * (0.55 + (i % 3) * 0.18), r * (0.25 + (i % 2) * 0.2), a, 0, Math.PI * 1.35);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function bolt(ctx: CanvasRenderingContext2D, pts: Pt[], widths: [number, string][], alpha = 1) {
  ctx.lineJoin = "round";
  for (const [w, col] of widths) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = col;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function fireball(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, now: number) {
  const c = PALETTE.fire;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, "#fffbe6");
  g.addColorStop(0.25, c[1]);
  g.addColorStop(0.6, c[3]);
  g.addColorStop(1, "rgba(120,10,0,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  // Wobbling flame silhouette.
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = r * (0.86 + 0.14 * Math.sin(a * 5 + now / 60) + 0.06 * Math.sin(a * 9 - now / 40));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py);
    else ctx.moveTo(px, py);
  }
  ctx.fill();
}

function shuriken(ctx: CanvasRenderingContext2D, x: number, y: number, R: number, rot: number, fill: string, edge: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.fillStyle = fill;
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let b = 0; b < 4; b++) {
    const a = (b * Math.PI) / 2;
    ctx.moveTo(Math.cos(a) * R * 0.18, Math.sin(a) * R * 0.18);
    ctx.quadraticCurveTo(Math.cos(a + 0.5) * R * 0.5, Math.sin(a + 0.5) * R * 0.5, Math.cos(a + 0.15) * R, Math.sin(a + 0.15) * R);
    ctx.quadraticCurveTo(Math.cos(a + 0.9) * R * 0.35, Math.sin(a + 0.9) * R * 0.35, Math.cos(a + Math.PI / 2) * R * 0.18, Math.sin(a + Math.PI / 2) * R * 0.18);
  }
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

const TOAD_SVG = `<svg viewBox="0 0 300 260" aria-hidden><defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2562b"/><stop offset="1" stop-color="#7a1e0c"/></linearGradient></defs>
<path d="M40 250c-30-10-38-60-10-95 8-40 40-78 75-90 8-30 30-48 45-48s37 18 45 48c35 12 67 50 75 90 28 35 20 85-10 95z" fill="url(#tg)" stroke="#2a0a04" stroke-width="5"/>
<circle cx="112" cy="60" r="22" fill="#ffe7a8" stroke="#2a0a04" stroke-width="5"/><circle cx="188" cy="60" r="22" fill="#ffe7a8" stroke="#2a0a04" stroke-width="5"/>
<rect x="104" y="55" width="16" height="6" fill="#111"/><rect x="180" y="55" width="16" height="6" fill="#111"/>
<path d="M85 120q65 38 130 0" fill="none" stroke="#2a0a04" stroke-width="6"/><path d="M70 150h160l-12 22H82z" fill="#3b2a6b" stroke="#150a26" stroke-width="4"/>
<path d="M150 150v70" stroke="#c9c9c9" stroke-width="6"/></svg>`;

const LOG_SVG = `<svg viewBox="0 0 120 170" aria-hidden><rect x="28" y="10" width="64" height="150" rx="14" fill="#8a5a2b" stroke="#3b220c" stroke-width="5"/>
<ellipse cx="60" cy="16" rx="30" ry="10" fill="#d9a86c" stroke="#3b220c" stroke-width="4"/><path d="M40 50q10 25 0 50M78 70q-8 20 0 45" stroke="#5a3814" stroke-width="4" fill="none"/></svg>`;

/** Play the jutsu's signature animation. */
export function castJutsu(id: JutsuId, s: CastScene) {
  const { fx } = s;
  const hand = point(s.hero, 0.72, 0.42);
  const foe = point(s.foe, 0.5, 0.45);
  const foeFront = point(s.foe, 0.25, 0.45);
  const floorY = point(s.hero, 0.5, 0.97).y;
  const hitAt = impactMs(id);
  let hit = false;
  const land = () => {
    if (hit) return;
    hit = true;
    s.onHit();
  };
  const dashPx = `${Math.max(40, foeFront.x - hand.x - 30)}px`;
  pulse(s.hero, "cast", 700);

  switch (id) {
    case "RASENGAN": {
      fx.anim(hitAt, (ctx, k, now) => {
        const grow = win(k, 0, 0.4);
        const go = ease(win(k, 0.42, 1));
        const x = lerp(hand.x, foeFront.x, go);
        const y = lerp(hand.y, foe.y, go);
        swirl(ctx, x, y, 8 + 26 * grow, now);
        if (go > 0) fx.spark(x - 20, y + (Math.random() - 0.5) * 30, -4, (Math.random() - 0.5) * 2, PALETTE.chakra[2], { size: 5, life: 22 });
      });
      later(hitAt * 0.42, () => {
        s.whoosh?.();
        pulse(s.hero, "dash", 1100, { "--dash": dashPx });
      });
      later(hitAt, () => {
        land();
        fx.impact("chakra", foe.x, foe.y);
        fx.anim(650, (ctx, k, now) => {
          // The spiral grinds into the target before blowing it away.
          swirl(ctx, foe.x - 10 * (1 - k), foe.y, 36 + 90 * ease(k), now, PALETTE.chakra);
          ctx.globalAlpha = 1 - k;
        });
        pulse(s.foe, "knock-far", 1100);
      });
      break;
    }

    case "CHIDORI": {
      fx.anim(hitAt + 250, (ctx, k, now) => {
        const t = k * (hitAt + 250);
        const go = ease(win(t, 380, hitAt));
        const x = lerp(hand.x, foeFront.x, go);
        const y = lerp(hand.y, foe.y, go);
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 70);
        glow.addColorStop(0, "rgba(255,255,255,0.95)");
        glow.addColorStop(0.3, "rgba(150,190,255,0.6)");
        glow.addColorStop(1, "rgba(60,80,255,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(x, y, 70, 0, Math.PI * 2);
        ctx.fill();
        // A thousand birds: short crackling arcs around the hand.
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = 30 + Math.random() * 55;
          bolt(ctx, jagged({ x, y }, { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r }, 5, 12), [
            [4, PALETTE.lightning[3]],
            [1.5, "#ffffff"],
          ], 0.9);
        }
        // Dash: the blade of lightning drags a spark trail along the ground.
        if (go > 0 && go < 1) for (let i = 0; i < 3; i++) fx.spark(x - 30 - Math.random() * 40, y + 20 + Math.random() * 60, -2 - Math.random() * 3, -Math.random() * 3, PALETTE.lightning[1], { size: 3, life: 20 });
        // Pierce: a straight bolt through the target.
        if (t >= hitAt) {
          bolt(ctx, jagged({ x: foeFront.x - 40, y: foe.y }, { x: foe.x + 220, y: foe.y + (Math.random() - 0.5) * 30 }, 8, 14), [
            [16, PALETTE.lightning[4]],
            [7, PALETTE.lightning[2]],
            [3, "#ffffff"],
          ], 1 - win(t, hitAt, hitAt + 250));
        }
        void now;
      });
      later(380, () => {
        s.whoosh?.();
        pulse(s.hero, "dash", 1100, { "--dash": dashPx });
      });
      later(hitAt, () => {
        land();
        fx.impact("lightning", foe.x, foe.y);
        pulse(s.foe, "knock", 700);
      });
      break;
    }

    case "GOKAKYU": {
      fx.anim(hitAt, (ctx, k, now) => {
        const x = lerp(hand.x, foe.x, ease(k));
        const y = lerp(hand.y - 10, foe.y, ease(k));
        const r = 50 + 130 * Math.sqrt(k);
        fireball(ctx, x, y, r, now);
        for (let i = 0; i < 5; i++) fx.spark(x - r * 0.6, y + (Math.random() - 0.5) * r, -2 - Math.random() * 3, -1 - Math.random() * 2, PALETTE.fire[(Math.random() * 5) | 0], { size: 9, life: 30, gravity: -0.05 });
      });
      later(hitAt, () => {
        land();
        fx.impact("fire", foe.x, foe.y);
        fx.burst(foe.x, foe.y, { colors: PALETTE.fire, count: 180, speed: 18, size: 10, life: 70, gravity: -0.1 });
        // The target keeps burning for a moment.
        fx.anim(900, (ctx, k, now) => {
          ctx.globalAlpha = 1 - k;
          fireball(ctx, foe.x, foe.y + 40 - 30 * k, 90 * (1 - k * 0.5), now);
        });
        pulse(s.foe, "knock", 700);
      });
      break;
    }

    case "RYUKA": {
      const dx = foe.x - hand.x;
      const dy = foe.y - hand.y;
      fx.anim(hitAt + 500, (ctx, k, now) => {
        const t = k * (hitAt + 500);
        const reach = ease(win(t, 0, hitAt));
        const fade = 1 - win(t, hitAt + 150, hitAt + 500);
        // Continuous jet of flame + the dragon's head at its front.
        for (let i = 0; i < 16 * fade; i++) {
          const f = Math.random() * reach;
          const wob = Math.sin(f * 12 + now / 50) * 18;
          fx.spark(hand.x + dx * f, hand.y + dy * f + wob + (Math.random() - 0.5) * 26 * f, dx * 0.006, -0.6, PALETTE.fire[(Math.random() * 5) | 0], { size: 8 + 10 * f, life: 16, gravity: -0.08 });
        }
        if (fade > 0) {
          // The flame jet itself: a thick, flickering ribbon that widens toward the target.
          const pts: Pt[] = [];
          for (let i = 0; i <= 20; i++) {
            const f = (i / 20) * reach;
            pts.push({ x: hand.x + dx * f, y: hand.y + dy * f + Math.sin(f * 14 - now / 40) * 16 * f });
          }
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          for (const [w, col, a] of [
            [90, "#e63946", 0.5],
            [56, "#ff5e1a", 0.7],
            [30, "#ffd166", 0.9],
            [12, "#fff3c4", 1],
          ] as [number, string, number][]) {
            ctx.globalAlpha = a * fade;
            ctx.strokeStyle = col;
            ctx.lineWidth = w * (0.8 + 0.2 * Math.sin(now / 35));
            ctx.beginPath();
            pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.stroke();
          }
          ctx.globalAlpha = 1;
          fireball(ctx, hand.x + dx * reach, hand.y + dy * reach + Math.sin(now / 60) * 10, 60 * fade + 14, now);
        }
      });
      later(hitAt, () => {
        land();
        fx.impact("fire", foe.x, foe.y);
        pulse(s.foe, "knock", 700);
      });
      break;
    }

    case "HOSENKA": {
      const balls = Array.from({ length: 8 }, (_, i) => ({ delay: i * 55, arc: 60 + Math.random() * 140, off: { x: (Math.random() - 0.5) * 70, y: (Math.random() - 0.5) * 120 }, hit: false }));
      fx.anim(hitAt + 450, (ctx, k, now) => {
        const t = k * (hitAt + 450);
        for (const b of balls) {
          const p = win(t, b.delay, b.delay + hitAt - 60);
          if (p <= 0 || b.hit) continue;
          if (p >= 1) {
            b.hit = true;
            fx.burst(foe.x + b.off.x, foe.y + b.off.y, { colors: PALETTE.fire, count: 26, speed: 8, size: 6, life: 30, gravity: -0.05 });
            continue;
          }
          const x = lerp(hand.x, foe.x + b.off.x, p);
          const y = lerp(hand.y, foe.y + b.off.y, p) - Math.sin(Math.PI * p) * b.arc;
          fireball(ctx, x, y, 24, now);
          for (let q = 0; q < 2; q++) fx.spark(x, y, -1.5 + Math.random(), -0.5 - Math.random(), PALETTE.fire[(Math.random() * 5) | 0], { size: 7, life: 18, gravity: -0.04 });
        }
      });
      later(hitAt, () => {
        land();
        pulse(s.foe, "knock", 700);
      });
      break;
    }

    case "SUIRYUDAN": {
      const path = (t: number): Pt => ({
        x: lerp(hand.x - 20, foe.x, t),
        y: lerp(floorY - 20, foe.y, t) - Math.sin(Math.PI * Math.min(1, t * 1.1)) * 280 + Math.sin(t * Math.PI * 3) * 28,
      });
      fx.anim(hitAt + 300, (ctx, k, now) => {
        const t = k * (hitAt + 300);
        const head = win(t, 0, hitAt);
        const fade = 1 - win(t, hitAt, hitAt + 300);
        const N = 28;
        for (let i = N; i >= 0; i--) {
          const u = head - (i / N) * 0.45;
          if (u < 0) continue;
          const p = path(u);
          const r = (1 - i / N) * 26 + 10;
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 1.6);
          g.addColorStop(0, `rgba(232,251,255,${0.9 * fade})`);
          g.addColorStop(0.45, `rgba(76,201,240,${0.75 * fade})`);
          g.addColorStop(1, "rgba(31,139,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r * 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
        if (fade > 0 && head > 0) {
          const p = path(head);
          const q = path(Math.max(0, head - 0.03));
          const ang = Math.atan2(p.y - q.y, p.x - q.x);
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(ang);
          ctx.globalAlpha = fade;
          ctx.fillStyle = "rgba(200,245,255,0.9)";
          ctx.beginPath(); // snout + open jaw
          ctx.moveTo(-20, -26);
          ctx.quadraticCurveTo(40, -24, 58, -6);
          ctx.lineTo(18, 0);
          ctx.lineTo(54, 18);
          ctx.quadraticCurveTo(20, 28, -20, 24);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc(14, -14, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          fx.spark(p.x, p.y, (Math.random() - 0.5) * 4, Math.random() * 2, PALETTE.water[(Math.random() * 5) | 0], { size: 4, life: 26, gravity: 0.2 });
        }
        void now;
      });
      later(hitAt, () => {
        land();
        fx.impact("water", foe.x, foe.y);
        fx.burst(foe.x, foe.y, { colors: PALETTE.water, count: 160, speed: 16, size: 6, life: 60, gravity: 0.35 });
        pulse(s.foe, "knock-far", 1000);
      });
      break;
    }

    case "KAGE_BUNSHIN": {
      const base = point(s.hero, 0.5, 0.5);
      const heroRect = s.hero?.getBoundingClientRect();
      const offs = [-90, 70, 150];
      s.poof?.();
      const clones = offs.map((ox, i) => {
        const at = { x: base.x + ox, y: base.y + (i - 1) * 14 };
        fx.smoke(at.x, at.y, { count: 14, size: 40, spread: 4 });
        const el = prop(s.layer, "clone", at, s.heroImg ? `<img src="${s.heroImg}" alt="" draggable="false"/>` : "");
        if (el && heroRect) {
          el.style.width = `${heroRect.width}px`;
          el.style.height = `${heroRect.height}px`;
        }
        return el;
      });
      later(420, () => {
        s.whoosh?.();
        clones.forEach((el, i) => {
          if (!el) return;
          el.style.transition = `transform ${hitAt - 420 - i * 60}ms cubic-bezier(.5,0,.9,.5)`;
          el.style.transform = `translate(-50%,-50%) translate(${foeFront.x - (base.x + offs[i]) - 20}px, ${foe.y - base.y + (i - 1) * 10}px)`;
        });
      });
      later(hitAt, () => {
        land();
        fx.impact("chakra", foe.x, foe.y);
        clones.forEach((el, i) =>
          later(i * 110, () => {
            fx.smoke(foe.x - 30 + i * 30, foe.y + (i - 1) * 40, { count: 12, size: 36 });
            if (i) s.poof?.();
            el?.remove();
          }),
        );
        pulse(s.foe, "knock", 700);
      });
      break;
    }

    case "KUCHIYOSE": {
      const feet = point(s.hero, 0.5, 0.96);
      // Summoning seal written on the ground.
      fx.anim(700, (ctx, k) => {
        ctx.globalAlpha = 1 - win(k, 0.7, 1);
        ctx.strokeStyle = "#ffd166";
        ctx.lineWidth = 3;
        ctx.save();
        ctx.translate(feet.x, feet.y);
        ctx.scale(1, 0.3);
        const r = 40 + 120 * ease(win(k, 0, 0.5));
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r * win(k, 0.2, 0.7), Math.sin(a) * r * win(k, 0.2, 0.7));
          ctx.stroke();
        }
        ctx.restore();
      });
      later(260, () => {
        s.poof?.();
        fx.smoke(feet.x, feet.y - 120, { count: 30, size: 70, spread: 6, life: 55 });
      });
      const toad = prop(s.layer, "toad", { x: feet.x - 40, y: feet.y }, TOAD_SVG);
      later(hitAt - 280, () => toad?.classList.add("stomp"));
      later(hitAt, () => {
        land();
        fx.ring(foe.x, point(s.foe, 0.5, 0.95).y, "#ffd166", { speed: 20, width: 10, life: 30 });
        fx.burst(foe.x, point(s.foe, 0.5, 0.9).y, { colors: ["#c9a36a", "#8a6a3f", "#ffffff"], count: 120, speed: 14, size: 7, life: 55, gravity: 0.25 });
        fx.impact("chakra", foe.x, foe.y);
        pulse(s.foe, "knock-far", 1100);
      });
      later(2150, () => {
        const r = toad?.getBoundingClientRect();
        if (r) fx.smoke(r.left + r.width / 2, r.top + r.height / 2, { count: 26, size: 70 });
        toad?.remove();
      });
      break;
    }

    case "KAWARIMI": {
      const base = point(s.hero, 0.5, 0.55);
      s.poof?.();
      fx.smoke(base.x, base.y, { count: 22, size: 50 });
      pulse(s.hero, "vanish", 1700);
      const log = prop(s.layer, "log", base, LOG_SVG);
      const behind = { x: point(s.foe, 1, 0.5).x + 40, y: base.y };
      let ghost: HTMLElement | null = null;
      later(480, () => {
        s.poof?.();
        fx.smoke(behind.x, behind.y, { count: 16, size: 44 });
        const heroRect = s.hero?.getBoundingClientRect();
        ghost = prop(s.layer, "clone ghost", behind, s.heroImg ? `<img src="${s.heroImg}" alt="" draggable="false"/>` : "");
        if (ghost && heroRect) {
          ghost.style.width = `${heroRect.width}px`;
          ghost.style.height = `${heroRect.height}px`;
        }
      });
      later(hitAt, () => {
        land();
        // Strike from behind: an X of blade flashes.
        fx.anim(380, (ctx, k) => {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 6 * (1 - k) + 1;
          const L = 120 * ease(Math.min(1, k * 3));
          ctx.beginPath();
          ctx.moveTo(foe.x - L, foe.y - L);
          ctx.lineTo(foe.x + L, foe.y + L);
          ctx.moveTo(foe.x + L, foe.y - L);
          ctx.lineTo(foe.x - L, foe.y + L);
          ctx.stroke();
        });
        fx.burst(foe.x, foe.y, { colors: ["#ffffff", "#ffd166", "#ff4d6d"], count: 70, speed: 10, size: 4, life: 36 });
        pulse(s.foe, "knock-back", 700);
      });
      later(1450, () => {
        fx.smoke(behind.x, behind.y, { count: 14, size: 40 });
        fx.smoke(base.x, base.y, { count: 14, size: 40 });
        ghost?.remove();
        log?.remove();
      });
      break;
    }

    case "HENGE": {
      // Transformation: the hero turns into a giant fūma shuriken and throws himself.
      const base = point(s.hero, 0.5, 0.5);
      s.poof?.();
      fx.smoke(base.x, base.y, { count: 22, size: 50 });
      pulse(s.hero, "vanish", 1500);
      fx.anim(hitAt, (ctx, k, now) => {
        const go = ease(win(k, 0.25, 1));
        const x = lerp(base.x, foe.x, go);
        const y = lerp(base.y, foe.y, go) - Math.sin(Math.PI * go) * 60;
        ctx.globalCompositeOperation = "source-over";
        shuriken(ctx, x, y, 70, now / (go > 0 ? 45 : 140), "#3c4452", "#c7d0dc");
      });
      later(hitAt * 0.25, () => s.whoosh?.());
      later(hitAt, () => {
        land();
        s.poof?.();
        fx.smoke(foe.x, foe.y, { count: 18, size: 44 });
        fx.impact("wind", foe.x, foe.y);
        pulse(s.foe, "knock", 700);
      });
      break;
    }

    case "KIRIN": {
      const sky = prop(s.layer, "storm", { x: 0, y: 0 });
      const top = { x: foe.x + 40, y: -20 };
      fx.anim(hitAt + 600, (ctx, k) => {
        const t = k * (hitAt + 600);
        // Sky flickers while the storm gathers.
        if (t < hitAt - 100 && Math.random() < 0.12) {
          const x = Math.random() * window.innerWidth;
          bolt(ctx, jagged({ x, y: 0 }, { x: x + (Math.random() - 0.5) * 200, y: 80 + Math.random() * 120 }, 6, 20), [[3, PALETTE.lightning[3]], [1, "#fff"]], 0.8);
        }
        if (t >= hitAt - 80) {
          // Kirin: the whole thunderhead comes down as one colossal bolt.
          const a = 1 - win(t, hitAt + 150, hitAt + 600);
          const pts = jagged(top, { x: foe.x, y: foe.y + 30 }, 10, 60);
          bolt(ctx, pts, [
            [60, "rgba(123,92,255,0.5)"],
            [28, PALETTE.lightning[3]],
            [12, PALETTE.lightning[1]],
            [5, "#ffffff"],
          ], a);
          for (let i = 0; i < 3; i++) {
            const p = pts[1 + ((Math.random() * (pts.length - 2)) | 0)];
            bolt(ctx, jagged(p, { x: p.x + (Math.random() - 0.5) * 240, y: p.y + Math.random() * 140 }, 5, 20), [[4, PALETTE.lightning[2]], [1.5, "#fff"]], a);
          }
        }
      });
      later(hitAt, () => {
        land();
        fx.impact("lightning", foe.x, foe.y);
        fx.burst(foe.x, foe.y + 60, { colors: PALETTE.lightning, count: 200, speed: 20, size: 7, life: 60 });
        fx.ring(foe.x, foe.y + 60, "#ffffff", { speed: 30, width: 8, life: 22 });
        pulse(s.foe, "knock-far", 1100);
      });
      later(hitAt + 900, () => sky?.classList.add("out"));
      later(hitAt + 1500, () => sky?.remove());
      break;
    }

    case "RASENSHURIKEN": {
      const thrown = 0.47;
      fx.anim(hitAt, (ctx, k, now) => {
        const grow = win(k, 0, thrown);
        const go = ease(win(k, thrown, 1));
        const x = lerp(hand.x, foe.x, go);
        const y = lerp(hand.y - 40 * grow, foe.y, go);
        const R = 22 + 40 * grow;
        swirl(ctx, x, y, R * 0.5, now, PALETTE.wind);
        ctx.globalAlpha = 0.7;
        shuriken(ctx, x, y, R * 1.7, now / 30, "rgba(200,255,238,0.55)", "rgba(255,255,255,0.9)");
        // Ringing wind blades.
        ctx.strokeStyle = "rgba(255,255,255,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, R * 1.9, 0, Math.PI * 2);
        ctx.stroke();
      });
      later(hitAt * thrown, () => s.whoosh?.());
      later(hitAt, () => {
        land();
        fx.impact("wind", foe.x, foe.y);
        // The dome: a sphere of wind full of microscopic needles.
        const needles = Array.from({ length: 70 }, () => ({ a: Math.random() * Math.PI * 2, r: 0.2 + Math.random() * 0.8, l: 8 + Math.random() * 22 }));
        fx.anim(1100, (ctx, k, now) => {
          const R = 40 + 190 * ease(win(k, 0, 0.35));
          const a = 1 - win(k, 0.6, 1);
          const g = ctx.createRadialGradient(foe.x, foe.y, R * 0.2, foe.x, foe.y, R);
          g.addColorStop(0, `rgba(255,255,255,${0.75 * a})`);
          g.addColorStop(0.7, `rgba(157,255,217,${0.4 * a})`);
          g.addColorStop(1, `rgba(31,211,154,${0.15 * a})`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(foe.x, foe.y, R, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${0.8 * a})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (const n of needles) {
            const aa = n.a + now / 900;
            const rr = R * n.r;
            ctx.moveTo(foe.x + Math.cos(aa) * rr, foe.y + Math.sin(aa) * rr);
            ctx.lineTo(foe.x + Math.cos(aa) * (rr + n.l), foe.y + Math.sin(aa) * (rr + n.l));
          }
          ctx.stroke();
        });
        pulse(s.foe, "knock-far", 1200);
      });
      break;
    }
  }
  // Safety net: the hit always lands, even if a timer was throttled.
  later(hitAt + 60, land);
}

/** The enemy's counter-attack: lunge across the arena and slash the hero. */
export function enemyStrike(s: { fx: FxEngine; hero: HTMLElement | null; foe: HTMLElement | null; onHit: () => void; blocked?: boolean }) {
  const heroC = point(s.hero, 0.5, 0.45);
  const heroFront = point(s.hero, 0.8, 0.45);
  const foeBack = point(s.foe, 0.25, 0.5);
  pulse(s.foe, "lunge", 700, { "--lunge": `${Math.min(-40, heroFront.x - foeBack.x + 30)}px` });
  later(240, () => {
    s.onHit();
    if (s.blocked) {
      s.fx.ring(heroFront.x, heroC.y, "#7fe3ff", { speed: 10, width: 12, life: 36 });
      return;
    }
    pulse(s.hero, "hurt", 600);
    s.fx.anim(320, (ctx, k) => {
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = "#ff2d55";
      ctx.lineCap = "round";
      for (let i = 0; i < 3; i++) {
        ctx.lineWidth = 7 * (1 - k) + 1;
        const L = 110 * ease(Math.min(1, k * 3));
        const ox = (i - 1) * 26;
        ctx.beginPath();
        ctx.moveTo(heroC.x + ox + L * 0.6, heroC.y - L);
        ctx.lineTo(heroC.x + ox - L * 0.6, heroC.y + L);
        ctx.stroke();
      }
    });
    s.fx.burst(heroC.x, heroC.y, { colors: ["#ff2d55", "#8b0000", "#ffffff"], count: 80, speed: 11, size: 5, life: 42 });
  });
}
