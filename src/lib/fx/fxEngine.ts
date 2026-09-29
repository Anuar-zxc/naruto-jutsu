/**
 * Lightweight 2D particle / projectile engine on a full-screen canvas.
 * The render loop only runs while something is alive, so it costs nothing at rest.
 */
import type { Element } from "@/types/game";
import { particleScale } from "@/lib/perf/quality";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  drag: number;
  gravity: number;
  shrink: boolean;
}

interface Ring {
  x: number;
  y: number;
  r: number;
  vr: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

interface Projectile {
  el: Element;
  from: { x: number; y: number };
  to: { x: number; y: number };
  t0: number;
  dur: number;
  hit: boolean;
  onHit?: () => void;
  bolt?: { x: number; y: number }[];
  boltAt?: number;
}

/** A bespoke timed drawing (jutsu animations): `draw` gets progress 0..1 each frame. */
interface Anim {
  t0: number;
  dur: number;
  draw: (ctx: CanvasRenderingContext2D, k: number, now: number) => void;
  done?: () => void;
}

/** Soft smoke puff, drawn with normal blending (it must be able to hide things). */
interface Puff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  life: number;
  max: number;
  shade: number;
}

export const PALETTE: Record<Element, string[]> = {
  fire: ["#fff3c4", "#ffd166", "#ff9f1c", "#ff5e1a", "#e63946"],
  water: ["#e8fbff", "#9be7ff", "#4cc9f0", "#1f8bff", "#3a5bff"],
  lightning: ["#ffffff", "#e3f1ff", "#b8c8ff", "#b28cff", "#7b5cff"],
  chakra: ["#ffffff", "#c9f4ff", "#7fe3ff", "#2ec5ff", "#1b6fff"],
  wind: ["#ffffff", "#e2fff4", "#9dffd9", "#5dffc1", "#1fd39a"],
};

const pick = <T,>(a: T[]) => a[(Math.random() * a.length) | 0];

export class FxEngine {
  private ctx: CanvasRenderingContext2D | null = null;
  private particles: Particle[] = [];
  private rings: Ring[] = [];
  private projectiles: Projectile[] = [];
  private anims: Anim[] = [];
  private puffs: Puff[] = [];
  private raf = 0;
  private last = 0;
  private W = 0;
  private H = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.resize();
  }

  resize() {
    // Full-screen canvas: 1.5× is visually identical for glowing particles and ~45% cheaper than 2×.
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    this.W = window.innerWidth;
    this.H = window.innerHeight;
    this.canvas.width = this.W * dpr;
    this.canvas.height = this.H * dpr;
    this.ctx = this.canvas.getContext("2d");
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  private kick() {
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.frame);
    }
  }

  burst(x: number, y: number, opts: { colors: string[]; count?: number; speed?: number; size?: number; life?: number; gravity?: number }) {
    const n = Math.round((opts.count ?? 40) * particleScale());
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 6) * (0.3 + Math.random());
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: (opts.life ?? 50) * (0.6 + Math.random() * 0.6),
        size: (opts.size ?? 4) * (0.5 + Math.random()),
        color: pick(opts.colors),
        drag: 0.93,
        gravity: opts.gravity ?? 0.05,
        shrink: true,
      });
    }
    this.kick();
  }

  ring(x: number, y: number, color: string, opts: { speed?: number; width?: number; life?: number } = {}) {
    this.rings.push({ x, y, r: 6, vr: opts.speed ?? 9, life: 0, max: opts.life ?? 34, color, width: opts.width ?? 5 });
    this.kick();
  }

  /** Run a custom canvas animation for `dur` ms. */
  anim(dur: number, draw: Anim["draw"], done?: () => void) {
    this.anims.push({ t0: performance.now(), dur, draw, done });
    this.kick();
  }

  /** Emit one free particle (used by jutsu animations for trails and streams). */
  spark(x: number, y: number, vx: number, vy: number, color: string, o: { size?: number; life?: number; gravity?: number; drag?: number } = {}) {
    if (particleScale() < 1 && Math.random() > particleScale()) return;
    this.particles.push({ x, y, vx, vy, life: 0, max: o.life ?? 30, size: o.size ?? 4, color, drag: o.drag ?? 0.95, gravity: o.gravity ?? 0, shrink: true });
    this.kick();
  }

  /** A "poof" cloud of white-grey smoke (shadow clones, substitution, summoning). */
  smoke(x: number, y: number, o: { count?: number; size?: number; spread?: number; life?: number } = {}) {
    const n = Math.max(6, Math.round((o.count ?? 18) * particleScale()));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (o.spread ?? 3) * (0.3 + Math.random());
      this.puffs.push({
        x: x + Math.cos(a) * 10,
        y: y + Math.sin(a) * 10,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp * 0.7 - 0.4,
        r: (o.size ?? 26) * (0.5 + Math.random() * 0.7),
        vr: 0.9 + Math.random() * 0.8,
        life: 0,
        max: (o.life ?? 45) * (0.7 + Math.random() * 0.5),
        shade: 200 + ((Math.random() * 55) | 0),
      });
    }
    this.kick();
  }

  /** Seal confirmed: small burst + ring in the element colour. */
  seal(x: number, y: number, el: Element) {
    this.burst(x, y, { colors: PALETTE[el], count: 34, speed: 7, size: 4, life: 40 });
    this.ring(x, y, PALETTE[el][2], { speed: 7, width: 4, life: 26 });
  }

  mistake(x: number, y: number) {
    this.burst(x, y, { colors: ["#ff3b3b", "#ff7a7a", "#8b0000"], count: 26, speed: 5, size: 3, life: 30 });
  }

  /** Charge-up swirl while the jutsu is forming. */
  charge(x: number, y: number, el: Element) {
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 120 + Math.random() * 120;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      const k = 0.045 + Math.random() * 0.03;
      this.particles.push({
        x: px,
        y: py,
        vx: (x - px) * k,
        vy: (y - py) * k,
        life: 0,
        max: 28 + Math.random() * 18,
        size: 2 + Math.random() * 3,
        color: pick(PALETTE[el]),
        drag: 0.96,
        gravity: 0,
        shrink: false,
      });
    }
    this.kick();
  }

  projectile(el: Element, from: { x: number; y: number }, to: { x: number; y: number }, dur: number, onHit?: () => void) {
    this.projectiles.push({ el, from, to, t0: performance.now(), dur, hit: false, onHit });
    this.kick();
  }

  impact(el: Element, x: number, y: number) {
    const c = PALETTE[el];
    // Brighter, heavier impacts: core flash, two shock rings and a wide debris cone.
    this.burst(x, y, { colors: c, count: 200, speed: 15, size: 7, life: 65, gravity: el === "water" ? 0.25 : 0.04 });
    this.burst(x, y, { colors: ["#ffffff", c[1]], count: 60, speed: 6, size: 12, life: 22 });
    this.ring(x, y, c[1], { speed: 16, width: 10, life: 32 });
    this.ring(x, y, c[3], { speed: 10, width: 5, life: 44 });
    this.ring(x, y, "#ffffff", { speed: 24, width: 3, life: 18 });
  }

  private frame = (now: number) => {
    const ctx = this.ctx;
    if (!ctx) return;
    const dt = Math.min(3, (now - this.last) / 16.67);
    this.last = now;
    ctx.clearRect(0, 0, this.W, this.H);

    // Smoke first, with normal blending, so glowing effects sit on top of it.
    ctx.globalCompositeOperation = "source-over";
    for (const p of this.puffs) {
      p.life += dt;
      p.vx *= Math.pow(0.95, dt);
      p.vy *= Math.pow(0.95, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      const k = 1 - p.life / p.max;
      if (k <= 0) continue;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      g.addColorStop(0, `rgba(${p.shade},${p.shade},${p.shade},${0.85 * k})`);
      g.addColorStop(0.6, `rgba(${p.shade - 30},${p.shade - 30},${p.shade - 25},${0.5 * k})`);
      g.addColorStop(1, "rgba(120,120,130,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    this.puffs = this.puffs.filter((p) => p.life < p.max);

    ctx.globalCompositeOperation = "lighter";
    for (const a of this.anims) {
      // rAF timestamps can be slightly older than t0 → clamp, never pass a negative progress.
      const k = Math.max(0, Math.min(1, (now - a.t0) / a.dur));
      ctx.save();
      try {
        a.draw(ctx, k, now);
      } catch {
        a.dur = 0; // a broken animation must never stop the whole effects loop
      }
      ctx.restore();
      if (k >= 1 || a.dur === 0) {
        a.dur = -1;
        a.done?.();
      }
    }
    this.anims = this.anims.filter((a) => a.dur >= 0);
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 1;

    for (const p of this.projectiles) this.stepProjectile(ctx, p, now);
    this.projectiles = this.projectiles.filter((p) => !p.hit);

    for (const p of this.particles) {
      p.life += dt;
      p.vx *= Math.pow(p.drag, dt);
      p.vy = p.vy * Math.pow(p.drag, dt) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = 1 - p.life / p.max;
      if (k <= 0) continue;
      const size = p.shrink ? p.size * k : p.size;
      ctx.globalAlpha = Math.min(1, k * 1.4);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.3, size), 0, Math.PI * 2);
      ctx.fill();
    }
    this.particles = this.particles.filter((p) => p.life < p.max);

    for (const r of this.rings) {
      r.life += dt;
      r.r += r.vr * dt;
      const k = 1 - r.life / r.max;
      if (k <= 0) continue;
      ctx.globalAlpha = k;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * k;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    this.rings = this.rings.filter((r) => r.life < r.max);

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    if (this.particles.length || this.rings.length || this.projectiles.length || this.anims.length || this.puffs.length) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      ctx.clearRect(0, 0, this.W, this.H);
      this.raf = 0;
    }
  };

  private stepProjectile(ctx: CanvasRenderingContext2D, p: Projectile, now: number) {
    const k = Math.min(1, (now - p.t0) / p.dur);
    const e = k * k * (3 - 2 * k); // smoothstep
    const dx = p.to.x - p.from.x;
    const dy = p.to.y - p.from.y;
    const c = PALETTE[p.el];

    if (p.el === "lightning") {
      // Bolt appears instantly and flickers; re-jagged every ~45 ms.
      if (!p.bolt || now - (p.boltAt ?? 0) > 45) {
        p.bolt = jagged(p.from, p.to, 7, 26);
        p.boltAt = now;
      }
      const alpha = k < 0.85 ? 0.6 + Math.random() * 0.4 : (1 - k) * 6;
      for (const [w, col] of [
        [14, c[4]],
        [6, c[2]],
        [2.5, c[0]],
      ] as [number, string][]) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        p.bolt.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
        ctx.stroke();
      }
      if (Math.random() < 0.5) {
        const i = 1 + ((Math.random() * (p.bolt.length - 2)) | 0);
        const a = p.bolt[i];
        const branch = jagged(a, { x: a.x + (Math.random() - 0.5) * 160, y: a.y + (Math.random() - 0.3) * 160 }, 4, 18);
        ctx.lineWidth = 2;
        ctx.strokeStyle = c[1];
        ctx.beginPath();
        branch.forEach((pt, j) => (j ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (!p.hit && k >= 0.3) {
        this.impact("lightning", p.to.x, p.to.y);
        p.onHit?.();
        p.onHit = undefined;
      }
      if (k >= 1) p.hit = true;
      return;
    }

    let x = p.from.x + dx * e;
    let y = p.from.y + dy * e;
    if (p.el === "water") {
      // Serpent path: sine wave perpendicular to the flight direction.
      const L = Math.hypot(dx, dy) || 1;
      const amp = 60 * Math.sin(Math.PI * k);
      const wav = Math.sin(k * Math.PI * 4) * amp;
      x += (-dy / L) * wav;
      y += (dx / L) * wav;
    } else {
      y -= Math.sin(Math.PI * k) * 80; // fire arcs upward
    }

    if (p.el === "wind") {
      // Rasenshuriken: a spinning four-bladed disc of wind.
      const R = 46;
      const rot = now / 40;
      ctx.save();
      ctx.translate(x, y);
      ctx.globalCompositeOperation = "lighter";
      for (let b = 0; b < 4; b++) {
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = "rgba(157,255,217,0.55)";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(R * 0.7, -R * 0.2 + Math.sin(rot) * 4, R * 1.6, 0);
        ctx.quadraticCurveTo(R * 0.7, R * 0.35, 0, 0);
        ctx.fill();
      }
      ctx.restore();
    }
    const size = p.el === "fire" ? 26 + 10 * Math.sin(now / 50) : p.el === "wind" ? 22 : 18;
    const g = ctx.createRadialGradient(x, y, 0, x, y, size * 2.2);
    g.addColorStop(0, c[0]);
    g.addColorStop(0.35, c[2]);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, size * 2.2, 0, Math.PI * 2);
    ctx.fill();

    const trail = p.el === "fire" ? 7 : 10;
    for (let i = 0; i < trail; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * size,
        y: y + (Math.random() - 0.5) * size,
        vx: (Math.random() - 0.5) * 2 - (dx / (Math.abs(dx) + 1)) * 1.5,
        vy: (Math.random() - 0.5) * 2 + (p.el === "fire" ? -1.2 : 0.6),
        life: 0,
        max: 24 + Math.random() * 20,
        size: (p.el === "fire" ? 7 : 5) * (0.5 + Math.random()),
        color: pick(c),
        drag: 0.94,
        gravity: p.el === "fire" ? -0.05 : 0.08,
        shrink: true,
      });
    }

    if (k >= 1 && !p.hit) {
      p.hit = true;
      this.impact(p.el, p.to.x, p.to.y);
      p.onHit?.();
    }
  }
}

export function jagged(a: { x: number; y: number }, b: { x: number; y: number }, segs: number, spread: number) {
  const pts = [a];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  for (let i = 1; i < segs; i++) {
    const t = i / segs;
    const off = (Math.random() - 0.5) * 2 * spread * Math.sin(Math.PI * t);
    pts.push({ x: a.x + dx * t + (-dy / L) * off, y: a.y + dy * t + (dx / L) * off });
  }
  pts.push(b);
  return pts;
}
