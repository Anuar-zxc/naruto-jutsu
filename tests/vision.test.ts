/**
 * Vision pipeline tests on synthetic hands.
 * Run: npm test
 */
import assert from "node:assert/strict";
import { test, run } from "./harness";
import { SIGN_LIST, SIGNS } from "../src/lib/vision/gestureDefinitions";
import { extractFrame } from "../src/lib/vision/gestureFeatures";
import { GestureRecognizer } from "../src/lib/vision/gestureRecognizer";
import { getCorrection } from "../src/lib/vision/correctionEngine";
import { curlsForShape, poseForSign, syntheticFrame, syntheticHand, type PoseOptions } from "../src/lib/vision/syntheticHand";
import type { SignId } from "../src/types/gestures";

const ASPECT = 16 / 9;
const features = (sign: SignId, o: PoseOptions = {}, seed = 1) => extractFrame(syntheticFrame(poseForSign(sign, o), 0, ASPECT, seed));
const correction = (expected: SignId, pose: SignId, o: PoseOptions = {}) => getCorrection(SIGNS[expected], features(pose, o));

// --- Features --------------------------------------------------------------

test("finger extension: straight ≈ 1, curled ≈ 0 across tilt and scale", () => {
  for (const tilt of [-35, 0, 35]) {
    for (const palm of [0.08, 0.15, 0.25]) {
      const open = extractFrame({ hands: [syntheticHand({ side: "right", curls: curlsForShape("OPEN"), center: { x: 1, y: 0.5 }, palm, tilt }, ASPECT)], aspect: ASPECT, t: 0 });
      const fist = extractFrame({ hands: [syntheticHand({ side: "right", curls: curlsForShape("FIST"), center: { x: 1, y: 0.5 }, palm, tilt }, ASPECT)], aspect: ASPECT, t: 0 });
      for (const f of ["index", "middle", "ring", "pinky"] as const) {
        assert.ok(open.hands[0].ext[f] > 0.9, `open ${f} tilt=${tilt} palm=${palm}: ${open.hands[0].ext[f]}`);
        assert.ok(fist.hands[0].ext[f] < 0.1, `fist ${f} tilt=${tilt} palm=${palm}: ${fist.hands[0].ext[f]}`);
      }
    }
  }
});

test("hand distance is measured in palm lengths (scale invariant)", () => {
  for (const palm of [0.08, 0.15, 0.22]) {
    const f = features("HORSE", { palm, distance: 2 });
    assert.ok(Math.abs((f.handDistance ?? 0) - 2) < 0.05, `palm=${palm} distance=${f.handDistance}`);
  }
});

test("sides: screen-left hand is the player's left", () => {
  const f = features("OX");
  assert.equal(f.hands[0].side, "left");
  assert.equal(f.hands[1].side, "right");
  assert.ok(f.hands[0].center.x < f.hands[1].center.x);
});

test("pointing angle: 0 = up, + = toward screen right", () => {
  const f = extractFrame({ hands: [syntheticHand({ side: "right", curls: curlsForShape("OPEN"), center: { x: 1, y: 0.5 }, tilt: 30 }, ASPECT)], aspect: ASPECT, t: 0 });
  assert.ok(Math.abs(f.hands[0].pointing - 30) < 8, `pointing=${f.hands[0].pointing}`);
});

// --- Classification --------------------------------------------------------

test("every seal is recognised under size / distance / tilt / noise variation", () => {
  const rec = new GestureRecognizer();
  let seed = 3;
  for (const def of SIGN_LIST) {
    const variants: PoseOptions[] = [{}, { palm: 0.09 }, { palm: 0.22 }, { noise: 0.003 }, { tilt: { left: -20, right: 20 } }, { swap: true }];
    if (def.distance?.max) variants.push({ distance: 0.9 }, { distance: def.distance.max - 0.2 });
    if (def.distance?.min) variants.push({ distance: def.distance.min + 0.3 }, { distance: 6 });
    for (const v of variants) {
      const f = features(def.id, v, seed++);
      const scores = rec.classifyGesture(f);
      const pick = rec.pickRaw(scores);
      assert.equal(pick.sign, def.id, `${def.id} ${JSON.stringify(v)} → ${pick.sign} (${scores.slice(0, 3).map((s) => `${s.sign}:${s.confidence.toFixed(2)}`).join(", ")})`);
    }
  }
});

test("seals are well separated: runner-up far below the winner", () => {
  const rec = new GestureRecognizer();
  for (const def of SIGN_LIST) {
    const [best, second] = rec.classifyGesture(features(def.id));
    assert.equal(best.sign, def.id);
    assert.ok(best.confidence > 0.9, `${def.id} confidence ${best.confidence}`);
    assert.ok(best.confidence - second.confidence > 0.3, `${def.id} vs ${second.sign}: ${best.confidence.toFixed(2)} / ${second.confidence.toFixed(2)}`);
  }
});

test("ambiguous pose (half-bent middle finger between TIGER and RAM) is UNKNOWN", () => {
  const rec = new GestureRecognizer();
  const f = features("TIGER", { override: { left: { middle: 0.55 }, right: { middle: 0.55 } } });
  const pick = rec.pickRaw(rec.classifyGesture(f));
  assert.notEqual(pick.sign, "TIGER");
  assert.notEqual(pick.sign, "RAM");
});

test("one hand only → nothing recognised", () => {
  const rec = new GestureRecognizer();
  const pick = rec.pickRaw(rec.classifyGesture(features("TIGER", { only: ["right"] })));
  assert.equal(pick.sign, null);
});

test("hands in the dead zone between HORSE and MONKEY → neither", () => {
  const rec = new GestureRecognizer();
  const pick = rec.pickRaw(rec.classifyGesture(features("HORSE", { distance: 3.0 })));
  assert.equal(pick.sign, null, `got ${pick.sign}`);
});

// --- Temporal smoothing ----------------------------------------------------

test("a seal is accepted only after being held, never from a single frame", () => {
  const rec = new GestureRecognizer();
  const frames = poseForSign("TIGER");
  let acceptedAt = -1;
  for (let i = 0; i < 30; i++) {
    const out = rec.process(syntheticFrame(frames, i * 33, ASPECT, i + 1));
    if (out.accepted) {
      acceptedAt = i * 33;
      assert.equal(out.accepted, "TIGER");
      break;
    }
  }
  assert.ok(acceptedAt >= 260, `accepted at ${acceptedAt}ms`);
  assert.ok(acceptedAt <= 500, `accepted too late: ${acceptedAt}ms`);
});

test("flickering labels (TIGER/SNAKE/TIGER/none) are never accepted", () => {
  const rec = new GestureRecognizer();
  const seq: (SignId | null)[] = ["TIGER", "SNAKE", "TIGER", null];
  for (let i = 0; i < 40; i++) {
    const s = seq[i % 4];
    const raw = s ? syntheticFrame(poseForSign(s), i * 33) : { hands: [], aspect: ASPECT, t: i * 33 };
    const out = rec.process(raw);
    assert.equal(out.accepted, null, `accepted ${out.accepted} at frame ${i}`);
  }
});

test("sequence TIGER → RAM → SNAKE accepts each seal once", () => {
  const rec = new GestureRecognizer();
  const got: SignId[] = [];
  let t = 0;
  for (const s of ["TIGER", "RAM", "SNAKE"] as SignId[]) {
    for (let i = 0; i < 20; i++) {
      const out = rec.process(syntheticFrame(poseForSign(s), (t += 33), ASPECT, t));
      if (out.accepted) got.push(out.accepted);
    }
  }
  assert.deepEqual(got, ["TIGER", "RAM", "SNAKE"]);
});

// --- Error mode / corrections ---------------------------------------------

test("correct pose → no correction", () => {
  for (const def of SIGN_LIST) assert.equal(getCorrection(def, features(def.id)), null, def.id);
});

test("TIGER with middle fingers curled → 'Extend your middle fingers.'", () => {
  const c = correction("TIGER", "RAM");
  assert.equal(c?.message, "Extend your middle fingers.");
  assert.deepEqual(c?.highlight, { side: "both", finger: "middle" });
});

test("RAM but middle fingers up → 'Fold down your middle fingers.'", () => {
  assert.equal(correction("RAM", "TIGER")?.message, "Fold down your middle fingers.");
});

test("TIGER with right index bent → 'Raise your right index finger.'", () => {
  const c = correction("TIGER", "TIGER", { override: { right: { index: 0.95 } } });
  assert.equal(c?.message, "Raise your right index finger.");
  assert.deepEqual(c?.highlight, { side: "right", finger: "index" });
});

test("DRAGON with left ring finger up → 'Close your left ring finger.'", () => {
  assert.equal(correction("DRAGON", "DRAGON", { override: { left: { ring: 0.05 } } })?.message, "Close your left ring finger.");
});

test("hands too far apart → 'Bring your hands closer together.'", () => {
  assert.equal(correction("TIGER", "TIGER", { distance: 4.5 })?.message, "Bring your hands closer together.");
  assert.equal(correction("SNAKE", "SNAKE", { distance: 4.5 })?.message, "Bring your hands closer together.");
});

test("MONKEY with hands together → 'Spread your hands wider apart.'", () => {
  assert.equal(correction("MONKEY", "HORSE")?.message, "Spread your hands wider apart.");
});

test("RAM with right hand tilted outward → rotate inward", () => {
  const c = correction("RAM", "RAM", { tilt: { left: 0, right: 70 } });
  assert.equal(c?.message, "Rotate your right hand inward — fingers straight up.");
  const c2 = correction("RAM", "RAM", { tilt: { left: -70, right: 0 } });
  assert.equal(c2?.message, "Rotate your left hand inward — fingers straight up.");
  const c3 = correction("RAM", "RAM", { tilt: { left: 60, right: 0 } });
  assert.equal(c3?.message, "Rotate your left hand outward — fingers straight up.");
});

test("one hand missing → names the missing hand", () => {
  assert.equal(correction("TIGER", "TIGER", { only: ["right"] })?.message, "Show both hands — your left hand is out of view.");
});

test("no hands → 'Move your hands into the frame.'", () => {
  assert.equal(getCorrection(SIGNS.TIGER, extractFrame({ hands: [], aspect: ASPECT, t: 0 }))?.message, "Move your hands into the frame.");
});

test("tiny hands → 'Move closer to the camera.'", () => {
  assert.equal(correction("TIGER", "TIGER", { palm: 0.05 })?.message, "Move closer to the camera.");
});

test("OX but two fists → whole-hand instruction to open one hand", () => {
  const m = correction("OX", "SNAKE", { distance: 2 })?.message ?? "";
  assert.match(m, /^Open your (left|right) hand/);
});

test("SNAKE but both palms open → 'Close both hands into fists.'", () => {
  assert.equal(correction("SNAKE", "HORSE")?.message, "Close both hands into fists.");
});

test("finger errors take priority over distance errors", () => {
  const c = correction("TIGER", "RAM", { distance: 4.5 });
  assert.equal(c?.kind, "fingers");
});

run();
