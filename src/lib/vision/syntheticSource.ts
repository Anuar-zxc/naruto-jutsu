/**
 * DEVELOPER-ONLY synthetic hand input (?synthetic=1).
 *
 * Generates landmark frames from the synthetic hand model so the whole pipeline
 * (features → classifier → corrections → game) can be exercised without a
 * webcam, e.g. in CI or headless browsers. It is never enabled by default and
 * the UI clearly labels it. The real game always uses the camera.
 *
 * Keys: 1 2 3 4 5 6 7 8 9 0 - = → Rat Ox Tiger Rabbit Dragon Snake Horse Ram Monkey Bird Dog Boar;
 *       q e r t → Confrontation Wind Spirit Fox; y u i o p [ ] \\ → Fire Water Thunder Earth Moon Star Mountain Shield
 *       Backspace = no hands, H = one hand only, W = hands too wide, X = wrong middle finger
 */
import type { RawFrame, SignId } from "@/types/gestures";
import type { HandSource } from "./handTracker";
import { poseForSign, syntheticFrame, type PoseOptions } from "./syntheticHand";

export const SYNTH_KEYS: SignId[] = ["RAT", "OX", "TIGER", "RABBIT", "DRAGON", "SNAKE", "HORSE", "RAM", "MONKEY", "BIRD", "DOG", "BOAR", "CONFRONT", "WIND", "SPIRIT", "FOX", "FIRE", "WATER", "THUNDER", "EARTH", "MOON", "STAR", "MOUNTAIN", "SHIELD"];
const KEY_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "=", "q", "e", "r", "t", "y", "u", "i", "o", "p", "[", "]", "\\"];

export interface SyntheticControl {
  set(sign: SignId | null, opts?: PoseOptions): void;
  get(): { sign: SignId | null; opts: PoseOptions };
}

declare global {
  interface Window {
    __shinobiSynthetic?: SyntheticControl;
  }
}

export class SyntheticHandSource implements HandSource {
  readonly kind = "synthetic" as const;
  private timer: ReturnType<typeof setInterval> | null = null;
  private sign: SignId | null = null;
  private opts: PoseOptions = {};
  private onKey = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement) return;
    const k = e.key.toLowerCase();
    const i = KEY_ORDER.indexOf(k);
    if (i >= 0) this.set(SYNTH_KEYS[i]);
    else if (k === "backspace") this.set(null);
    else if (k === "h" && this.sign) this.set(this.sign, { only: ["right"] });
    else if (k === "w" && this.sign) this.set(this.sign, { distance: 4.8 });
    else if (k === "x" && this.sign) this.set(this.sign, { override: { left: { middle: 0.5 }, right: { middle: 0.5 } } });
  };

  set(sign: SignId | null, opts: PoseOptions = {}) {
    this.sign = sign;
    this.opts = opts;
  }

  async init() {
    window.__shinobiSynthetic = { set: (s, o) => this.set(s, o), get: () => ({ sign: this.sign, opts: this.opts }) };
    window.addEventListener("keydown", this.onKey);
  }

  async openCamera() {
    /* no camera */
  }

  start(_video: HTMLVideoElement, onFrame: (f: RawFrame | null) => void) {
    const aspect = 16 / 9;
    let n = 0;
    this.timer = setInterval(() => {
      const t = performance.now();
      n++;
      if (!this.sign) return onFrame({ hands: [], aspect, t });
      // Gentle sway so the overlay looks alive.
      const cy = 0.56 + Math.sin(n / 18) * 0.01;
      onFrame(syntheticFrame(poseForSign(this.sign, { noise: 0.0015, cy, ...this.opts }), t, aspect, n));
    }, 33);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    window.removeEventListener("keydown", this.onKey);
    delete window.__shinobiSynthetic;
  }
}
