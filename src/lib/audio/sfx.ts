/**
 * All sound effects are synthesised at runtime with the Web Audio API —
 * no audio files, nothing copyrighted, zero download size.
 */
import type { Element } from "@/types/game";

type Ctx = AudioContext;

export class Sfx {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  /** Must be called from a user gesture (browser autoplay policy). */
  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.5;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
  }

  private ready(): Ctx | null {
    if (!this.ctx || !this.master || this.muted) return null;
    return this.ctx;
  }

  private tone(freq: number, dur: number, opts: { type?: OscillatorType; gain?: number; to?: number; delay?: number; attack?: number } = {}) {
    const c = this.ready();
    if (!c) return;
    const t0 = c.currentTime + (opts.delay ?? 0);
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = opts.type ?? "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const peak = opts.gain ?? 0.3;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.008));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(this.master!);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  private noise(dur: number, opts: { type?: BiquadFilterType; freq?: number; to?: number; q?: number; gain?: number; delay?: number; attack?: number } = {}) {
    const c = this.ready();
    if (!c || !this.noiseBuf) return;
    const t0 = c.currentTime + (opts.delay ?? 0);
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = opts.type ?? "lowpass";
    f.frequency.setValueAtTime(opts.freq ?? 1200, t0);
    if (opts.to) f.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = c.createGain();
    const peak = opts.gain ?? 0.4;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.01));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.master!);
    src.start(t0, Math.random() * 0.4);
    src.stop(t0 + dur + 0.05);
  }

  /** Seal confirmed — pitch climbs with each step of the sequence. */
  confirm(step = 0) {
    const base = 520 * Math.pow(2, (step * 3) / 12);
    this.tone(base, 0.16, { type: "triangle", gain: 0.28 });
    this.tone(base * 1.5, 0.22, { type: "sine", gain: 0.16, delay: 0.05 });
    this.noise(0.08, { type: "highpass", freq: 4000, gain: 0.08 });
  }

  error() {
    this.tone(160, 0.28, { type: "sawtooth", gain: 0.16, to: 110 });
    this.tone(170, 0.28, { type: "square", gain: 0.06, to: 115 });
  }

  hint() {
    this.tone(330, 0.09, { type: "sine", gain: 0.08 });
  }

  tick() {
    this.tone(880, 0.09, { type: "square", gain: 0.1 });
  }

  go() {
    this.tone(660, 0.12, { type: "square", gain: 0.12 });
    this.tone(1320, 0.3, { type: "triangle", gain: 0.16, delay: 0.06 });
  }

  select() {
    this.tone(440, 0.08, { type: "triangle", gain: 0.14 });
    this.tone(660, 0.12, { type: "triangle", gain: 0.12, delay: 0.05 });
  }

  detected() {
    [392, 523, 659].forEach((f, i) => this.tone(f, 0.25, { type: "triangle", gain: 0.14, delay: i * 0.07 }));
  }

  charge() {
    this.noise(0.9, { type: "bandpass", freq: 300, to: 3500, q: 4, gain: 0.35, attack: 0.5 });
    this.tone(110, 0.9, { type: "sawtooth", gain: 0.08, to: 440, attack: 0.6 });
  }

  attack(el: Element) {
    if (el === "fire") {
      this.noise(0.9, { type: "lowpass", freq: 2500, to: 300, gain: 0.55, attack: 0.02 });
      this.tone(90, 0.7, { type: "sawtooth", gain: 0.12, to: 45 });
    } else if (el === "water") {
      this.noise(1.1, { type: "bandpass", freq: 600, to: 1800, q: 2, gain: 0.45, attack: 0.15 });
      this.tone(220, 0.9, { type: "sine", gain: 0.12, to: 110 });
    } else if (el === "chakra") {
      [392, 523, 784, 1047].forEach((f, i) => this.tone(f, 0.5, { type: "sine", gain: 0.12, delay: i * 0.05 }));
      this.noise(0.8, { type: "bandpass", freq: 1200, to: 4000, q: 3, gain: 0.3, attack: 0.1 });
    } else {
      for (let i = 0; i < 6; i++) this.noise(0.07, { type: "highpass", freq: 2500, gain: 0.5, delay: i * 0.05 + Math.random() * 0.03 });
      this.tone(1800, 0.4, { type: "sawtooth", gain: 0.08, to: 200 });
    }
  }

  hit() {
    this.tone(120, 0.35, { type: "sine", gain: 0.5, to: 40 });
    this.noise(0.25, { type: "lowpass", freq: 900, gain: 0.4 });
  }

  fail() {
    [440, 370, 311, 220].forEach((f, i) => this.tone(f, 0.3, { type: "triangle", gain: 0.13, delay: i * 0.13 }));
  }

  victory() {
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(f, 0.35, { type: "triangle", gain: 0.16, delay: i * 0.11 }));
    this.noise(1.4, { type: "highpass", freq: 3000, gain: 0.08, delay: 0.5, attack: 0.3 });
  }

  combo() {
    this.tone(784, 0.1, { type: "square", gain: 0.1 });
    this.tone(1175, 0.18, { type: "square", gain: 0.1, delay: 0.07 });
  }
}
