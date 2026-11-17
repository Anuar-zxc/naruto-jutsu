import { extractHand } from "@/lib/vision/gestureFeatures";
import type { RawHand } from "@/types/gestures";
import type { CameraLetter } from "./course";

/** Compare the tracked hand with the static form shown in the reference photo. */
export function matchesHandshape(hand: RawHand, aspect: number, target: CameraLetter) {
  if (hand.landmarks.length !== 21 || hand.world.length !== 21) return false;
  const { ext, pointing, screen, size } = extractHand(hand, aspect);
  if (size < 0.055 || Math.abs(pointing) > 65) return false;
  const distance = (a: number, b: number) => Math.hypot(screen[a].x - screen[b].x, screen[a].y - screen[b].y) / size;
  const thumbSpread = distance(4, 5);
  const indexGap = distance(8, 12);
  const thumbToPinky = distance(4, 20);

  const up = (extension: number) => extension >= 0.72;
  const bent = (extension: number) => extension <= 0.35;

  switch (target) {
    case "v":
      return up(ext.index) && up(ext.middle) && up(ext.ring) && up(ext.pinky)
        && thumbSpread >= 0.28 && indexGap <= 0.48 && distance(12, 16) <= 0.51;
    case "n":
      return up(ext.index) && up(ext.middle) && up(ext.pinky)
        && thumbSpread <= 0.37 && indexGap >= 0.46;
    case "u":
      return bent(ext.index) && bent(ext.middle) && bent(ext.ring) && up(ext.pinky)
        && thumbSpread >= 0.55 && thumbToPinky >= 1.25;
    case "k":
      return up(ext.index) && up(ext.middle) && bent(ext.ring) && bent(ext.pinky)
        && thumbSpread <= 0.47 && indexGap <= 0.43;
    case "y":
      return up(ext.index) && bent(ext.middle) && bent(ext.ring) && up(ext.pinky)
        && thumbSpread <= 0.43 && thumbToPinky <= 1.13;
  }
}
