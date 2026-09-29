/**
 * Soundtrack player.
 *
 * Each scene has a track id. If `public/assets/music/<id>.mp3` exists (e.g. a
 * licensed soundtrack added by the project owner), it is streamed and
 * cross-faded. Otherwise an ORIGINAL procedural score is generated live with the
 * Web Audio API: Japanese in-scale (miyako-bushi) melodies on a koto-like pluck,
 * a breathy flute pad and taiko drums — a different mood per scene.
 */

export type TrackId = "menu" | "dialogue" | "battle" | "boss" | "victory";

const FILE = (id: TrackId) => `/assets/music/${id}.mp3`;
const MUSIC_VOL = 0.55;

/** In-scale (miyako-bushi) on E: E F A B C, over several octaves (MIDI). */
const SCALE = [52, 53, 57, 59, 60, 64, 65, 69, 71, 72, 76, 77, 81];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

interface Style {
  bpm: number;
  /** Melody density 0..1 per eighth note. */
  density: number;
  /** Taiko pattern over 16 sixteenths: 2 = big drum, 1 = small drum. */
  drums: number[];
  bass: boolean;
  pad: boolean;
  octave: number;
}

const STYLES: Record<TrackId, Style> = {
  menu: { bpm: 72, density: 0.35, drums: [2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], bass: true, pad: true, octave: 0 },
  dialogue: { bpm: 60, density: 0.2, drums: new Array(16).fill(0), bass: false, pad: true, octave: 1 },
  battle: { bpm: 132, density: 0.6, drums: [2, 0, 1, 0, 2, 0, 1, 1, 2, 0, 1, 0, 2, 1, 1, 1], bass: true, pad: false, octave: 1 },
  boss: { bpm: 150, density: 0.75, drums: [2, 1, 1, 0, 2, 1, 2, 1, 2, 1, 1, 0, 2, 2, 1, 1], bass: true, pad: true, octave: 1 },
  victory: { bpm: 96, density: 0.5, drums: [2, 0, 0, 0, 1, 0, 0, 0, 2, 0, 1, 0, 1, 0, 0, 0], bass: true, pad: true, octave: 2 },
};

/** Deterministic PRNG so every scene has its own repeatable (original) phrase. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

/** A 2-bar phrase (16 eighths) as scale-degree indexes or -1 for rests. */
function composePhrase(id: TrackId, density: number): number[] {
  const r = rng([...id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
  const out: number[] = [];
  let deg = 4;
  for (let i = 0; i < 16; i++) {
    if (r() > density && i % 4 !== 0) {
      out.push(-1);
      continue;
    }
    deg = Math.max(0, Math.min(SCALE.length - 1, deg + Math.round((r() - 0.5) * 4)));
    out.push(deg);
  }
  out[15] = 4; // resolve to the tonic area
  return out;
}

class Procedural {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextTime = 0;
  private step = 0;
  private phraseA: number[] = [];
  private phraseB: number[] = [];
  private style: Style = STYLES.menu;
  private noise: AudioBuffer;

  constructor(
    private ctx: AudioContext,
    private out: GainNode,
  ) {
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  start(id: TrackId) {
    this.stop();
    this.style = STYLES[id];
    this.phraseA = composePhrase(id, this.style.density);
    this.phraseB = composePhrase(`${id}b` as TrackId, this.style.density);
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const sixteenth = 60 / this.style.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      this.play(this.step, this.nextTime, sixteenth);
      this.nextTime += sixteenth;
      this.step = (this.step + 1) % 64;
    }
  }

  private play(step: number, t: number, sx: number) {
    const s = this.style;
    const inBar = step % 16;
    const drum = s.drums[inBar];
    if (drum) this.taiko(t, drum === 2);
    if (step % 2 === 0) {
      const phrase = step < 32 ? this.phraseA : this.phraseB;
      const deg = phrase[(step / 2) % 16];
      if (deg >= 0) this.pluck(midi(SCALE[deg] + 12 * (s.octave - 1)), t, sx * 3);
    }
    if (s.bass && inBar === 0) this.bass(midi(step < 32 ? 40 : 45), t, sx * 14);
    if (s.pad && step % 32 === 0) this.pad(midi(step < 32 ? 64 : 69), t, sx * 30);
  }

  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    g.connect(this.out);
    return g;
  }

  /** Koto-like pluck: bright triangle + detuned saw through a closing lowpass. */
  private pluck(f: number, t: number, dur: number) {
    const g = this.env(t, 0.16, 0.004, dur);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(f * 8, t);
    lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
    lp.connect(g);
    for (const [type, det, vol] of [
      ["triangle", 0, 1],
      ["sawtooth", 7, 0.25],
    ] as const) {
      const o = this.ctx.createOscillator();
      const v = this.ctx.createGain();
      v.gain.value = vol;
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(v).connect(lp);
      o.start(t);
      o.stop(t + dur + 0.05);
    }
  }

  private bass(f: number, t: number, dur: number) {
    const g = this.env(t, 0.14, 0.02, dur);
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  /** Breathy flute-like pad with slow vibrato. */
  private pad(f: number, t: number, dur: number) {
    const g = this.env(t, 0.05, dur * 0.3, dur * 0.7);
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const lfo = this.ctx.createOscillator();
    const lg = this.ctx.createGain();
    lfo.frequency.value = 5;
    lg.gain.value = 4;
    lfo.connect(lg).connect(o.frequency);
    o.connect(g);
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    n.loop = true;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f * 2;
    bp.Q.value = 8;
    const ng = this.ctx.createGain();
    ng.gain.value = 0.15;
    n.connect(bp).connect(ng).connect(g);
    for (const node of [o, lfo, n]) {
      node.start(t);
      node.stop(t + dur + 0.1);
    }
  }

  private taiko(t: number, big: boolean) {
    const g = this.env(t, big ? 0.5 : 0.22, 0.003, big ? 0.45 : 0.18);
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(big ? 120 : 220, t);
    o.frequency.exponentialRampToValueAtTime(big ? 45 : 110, t + 0.2);
    o.connect(g);
    o.start(t);
    o.stop(t + 0.5);
    const n = this.ctx.createBufferSource();
    n.buffer = this.noise;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = big ? 700 : 1800;
    const ng = this.env(t, big ? 0.18 : 0.1, 0.002, 0.08);
    n.connect(lp).connect(ng);
    n.start(t);
    n.stop(t + 0.12);
  }
}

export class MusicPlayer {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private proc: Procedural | null = null;
  private audio: HTMLAudioElement | null = null;
  private current: TrackId | null = null;
  private available = new Map<TrackId, boolean>();
  private fadeTimer: ReturnType<typeof setInterval> | null = null;
  enabled = true;

  unlock() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.out = this.ctx.createGain();
      this.out.gain.value = this.enabled ? MUSIC_VOL * 0.8 : 0;
      this.out.connect(this.ctx.destination);
      this.proc = new Procedural(this.ctx, this.out);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(on ? MUSIC_VOL * 0.8 : 0, this.ctx.currentTime, 0.2);
    if (this.audio) this.audio.volume = on ? MUSIC_VOL : 0;
  }

  private async hasFile(id: TrackId): Promise<boolean> {
    if (this.available.has(id)) return this.available.get(id)!;
    let ok = false;
    try {
      const r = await fetch(FILE(id), { method: "HEAD" });
      ok = r.ok && (r.headers.get("content-type") ?? "").includes("audio");
    } catch {
      ok = false;
    }
    this.available.set(id, ok);
    return ok;
  }

  /** Switch to a scene's track (no-op if already playing). */
  async play(id: TrackId) {
    if (id === this.current) return;
    this.current = id;
    if (!this.ctx) return;
    const file = await this.hasFile(id);
    if (this.current !== id) return; // superseded while checking
    this.fadeOutAudio();
    this.proc?.stop();
    if (file) {
      const a = new Audio(FILE(id));
      a.loop = id !== "victory";
      a.volume = 0;
      this.audio = a;
      void a.play().catch(() => undefined);
      this.fadeTo(a, this.enabled ? MUSIC_VOL : 0);
    } else {
      this.proc?.start(id);
    }
  }

  stop() {
    this.current = null;
    this.proc?.stop();
    this.fadeOutAudio();
  }

  private fadeTo(a: HTMLAudioElement, target: number) {
    if (this.fadeTimer) clearInterval(this.fadeTimer);
    this.fadeTimer = setInterval(() => {
      const v = a.volume + (target - a.volume) * 0.15;
      a.volume = Math.max(0, Math.min(1, Math.abs(target - v) < 0.01 ? target : v));
      if (a.volume === target && this.fadeTimer) clearInterval(this.fadeTimer);
    }, 50);
  }

  private fadeOutAudio() {
    const old = this.audio;
    if (!old) return;
    this.audio = null;
    const id = setInterval(() => {
      old.volume = Math.max(0, old.volume - 0.06);
      if (old.volume <= 0) {
        clearInterval(id);
        old.pause();
      }
    }, 50);
  }
}

/** Which track fits the current game situation. */
export function trackFor(phase: string, bossHp: number, bossMaxHp: number): TrackId | null {
  if (phase === "IDLE") return null;
  if (phase === "VICTORY") return "victory";
  if (phase === "DEFEAT") return null; // the defeat sting plays alone
  if (phase === "DIALOGUE" || phase === "TRAINING") return "dialogue";
  if (["COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED", "JUTSU_SELECTION"].includes(phase)) {
    return bossHp <= bossMaxHp * 0.35 ? "boss" : "battle";
  }
  return "menu";
}
