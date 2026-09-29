/**
 * Adaptive visual quality. Starts from the device's capabilities and drops to
 * "low" automatically when the tracking loop can't keep ~22 fps. Low quality
 * turns off film grain, backdrop blur, falling leaves and halves particles.
 */
type Quality = "high" | "low";

let quality: Quality = "high";
const subs = new Set<(q: Quality) => void>();

export const getQuality = () => quality;
export const particleScale = () => (quality === "low" ? 0.45 : 1);

export function setQuality(q: Quality) {
  if (q === quality) return;
  quality = q;
  if (typeof document !== "undefined") document.documentElement.classList.toggle("lowfx", q === "low");
  subs.forEach((f) => f(q));
}

/** Initial guess from the hardware (few cores / low memory / reduced motion → low). */
export function initQuality() {
  if (typeof navigator === "undefined") return;
  const cores = navigator.hardwareConcurrency ?? 8;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  setQuality(cores <= 4 || mem <= 4 || reduce ? "low" : "high");
}

let slowSince = 0;
/** Feed the measured tracking fps; 3 s below 22 fps switches to low quality for this session. */
export function reportFps(fps: number, now = performance.now()) {
  if (quality === "low" || fps <= 0) return;
  if (fps < 22) {
    if (!slowSince) slowSince = now;
    else if (now - slowSince > 3000) setQuality("low");
  } else slowSince = 0;
}
