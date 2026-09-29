/**
 * Finger control of the UI: the latest hand frame, whether the player wants it,
 * and in which phases the hands are free (not busy making seals).
 * Module-level store so the tracker loop can write without touching React.
 */
import type { FrameFeatures } from "@/types/gestures";
import type { Phase } from "@/types/game";

const LS = "shinobi.handctl";
let enabled = true;
let latest: FrameFeatures | null = null;
let latestAt = 0;
const subs = new Set<() => void>();

try {
  enabled = typeof localStorage === "undefined" || localStorage.getItem(LS) !== "0";
} catch {
  enabled = true;
}

/** Phases where the hands are making seals — the cursor stays off there. */
const BUSY: Phase[] = ["COUNTDOWN", "PLAYING", "SUCCESS", "JUTSU_CAST", "TRAINING", "CAMERA_CHECK", "IDLE"];

export const handControl = {
  isOn: () => enabled,
  set(on: boolean) {
    enabled = on;
    try {
      localStorage.setItem(LS, on ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
    subs.forEach((f) => f());
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => {
      subs.delete(f);
    };
  },
  /** Should the pointer be live in this phase? */
  activeIn: (phase: Phase) => enabled && !BUSY.includes(phase),
  push(f: FrameFeatures) {
    latest = f;
    latestAt = performance.now();
  },
  /** Latest frame, or null if the model hasn't produced one recently. */
  latest: () => (performance.now() - latestAt < 400 ? latest : null),
};
