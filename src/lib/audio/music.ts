/**
 * Soundtrack player.
 *
 * Each scene has a track id. If `public/assets/music/<id>.mp3` exists (e.g. a
 * licensed soundtrack added by the project owner), it is streamed and
 * cross-faded. Otherwise an ORIGINAL procedural score is generated live with the
 * Web Audio API: Japanese in-scale (miyako-bushi) melodies on a koto-like pluck,
 * a breathy flute pad and taiko drums — a different mood per scene.
 */

export type TrackId = "menu" | "dialogue" | "battle" | "boss" | "victory" | "defeat";

/** Extra files that can stand in for a scene (one picked at random per fight). */
const VARIANTS: Partial<Record<TrackId, string[]>> = { battle: ["battle", "battle2", "battle3"] };
/** Scenes that stay silent when their file is missing (no procedural fallback). */
const FILE_ONLY: TrackId[] = ["defeat"];
const FILE = (name: string) => `/assets/music/${name}.mp3`;
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
  defeat: { bpm: 56, density: 0.15, drums: new Array(16).fill(0), bass: false, pad: true, octave: 0 },
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
  /** Per-track bus: fading it cuts even the notes already scheduled / still ringing. */
  private bus: GainNode | null = null;

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
    this.bus = this.ctx.createGain();
    this.bus.gain.value = 1;
    this.bus.connect(this.out);
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
    const bus = this.bus;
    this.bus = null;
    if (bus) {
      const t = this.ctx.currentTime;
      bus.gain.cancelScheduledValues(t);
      bus.gain.setValueAtTime(bus.gain.value, t);
      bus.gain.linearRampToValueAtTime(0, t + 0.35);
      setTimeout(() => bus.disconnect(), 500);
    }
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
    g.connect(this.bus ?? this.out);
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
  /** The ONE element allowed to be audible. */
  private audio: HTMLAudioElement | null = null;
  /** Every element we ever started, so none can be left playing. */
  private live = new Set<HTMLAudioElement>();
  private fades = new Map<HTMLAudioElement, ReturnType<typeof setInterval>>();
  private current: TrackId | null = null;
  /** Wanted track (may be set before audio is unlocked). */
  private wanted: TrackId | null = null;
  /** Bumped on every play/stop so stale async work can bail out. */
  private token = 0;
  private available = new Map<string, boolean>();
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
    // A track requested before the first click starts now.
    if (this.wanted && this.current !== this.wanted) void this.play(this.wanted);
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.out && this.ctx) this.out.gain.setTargetAtTime(on ? MUSIC_VOL * 0.8 : 0, this.ctx.currentTime, 0.2);
    if (this.audio) this.fade(this.audio, on ? MUSIC_VOL : 0);
  }

  private async hasFile(id: string): Promise<boolean> {
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

  /** Switch to a scene's track (no-op if already playing). Never plays two tracks at once. */
  async play(id: TrackId) {
    this.wanted = id;
    if (id === this.current || !this.ctx) return;
    const my = ++this.token;
    this.current = id;
    const names = VARIANTS[id] ?? [id];
    const found: string[] = [];
    for (const n of names) if (await this.hasFile(n)) found.push(n);
    if (my !== this.token) return; // superseded while checking
    this.silenceAll();
    const file = found.length ? found[Math.floor(Math.random() * found.length)] : null;
    if (file) {
      const a = new Audio(FILE(file));
      a.loop = id !== "victory";
      a.volume = 0;
      this.audio = a;
      this.live.add(a);
      void a.play().catch(() => undefined);
      this.fade(a, this.enabled ? MUSIC_VOL : 0);
    } else if (!FILE_ONLY.includes(id)) {
      this.proc?.start(id);
    }
  }

  stop() {
    this.token++;
    this.wanted = null;
    this.current = null;
    this.silenceAll();
  }

  /** Fade out and release every streamed track and the generated score. */
  private silenceAll() {
    this.proc?.stop();
    for (const a of this.live) {
      this.fade(a, 0, () => {
        a.pause();
        a.removeAttribute("src");
        a.load();
        this.live.delete(a);
      });
    }
    this.audio = null;
  }

  /** One fade per element: a new fade cancels the previous one (no tug-of-war). */
  private fade(a: HTMLAudioElement, target: number, done?: () => void) {
    const prev = this.fades.get(a);
    if (prev) clearInterval(prev);
    const step = target === 0 ? 0.08 : 0.15;
    const id = setInterval(() => {
      const v = target === 0 ? a.volume - step : a.volume + (target - a.volume) * step;
      a.volume = Math.max(0, Math.min(1, Math.abs(target - v) < 0.01 || (target === 0 && v <= 0) ? target : v));
      if (a.volume === target) {
        clearInterval(id);
        this.fades.delete(a);
        done?.();
      }
    }, 40);
    this.fades.set(a, id);
  }
}

/** Which track fits the current game situation. */
export function trackFor(phase: string, bossHp: number, bossMaxHp: number): TrackId | null {
  if (phase === "IDLE") return null;
  if (phase === "VICTORY") return "victory";
  if (phase === "DEFEAT") return "defeat"; // only if defeat.mp3 was added — otherwise the sting plays alone
  if (phase === "DIALOGUE" || phase === "TRAINING") return "dialogue";
  if (["COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "NEXT_ROUND", "FAILED", "JUTSU_SELECTION"].includes(phase)) {
    // One track for the whole fight: no switch (and restart) when the enemy is low.
    void bossHp;
    void bossMaxHp;
    return "battle";
  }
  return "menu";
}
