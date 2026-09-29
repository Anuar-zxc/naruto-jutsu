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
const en = (expected: SignId, pose: SignId, o: PoseOptions = {}) => correction(expected, pose, o)?.text.en;

// --- Features --------------------------------------------------------------

test("finger extension: straight ≈ 1, curled ≈ 0 across tilt and scale", () => {
  for (const tilt of [-35, 0, 35, 180]) {
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
    const f = features("MONKEY", { palm, distance: 2 });
    assert.ok(Math.abs((f.handDistance ?? 0) - 2) < 0.05, `palm=${palm} distance=${f.handDistance}`);
  }
});

test("sides: screen-left hand is the player's left", () => {
  const f = features("OX");
  assert.equal(f.hands[0].side, "left");
  assert.equal(f.hands[1].side, "right");
  assert.ok(f.hands[0].center.x < f.hands[1].center.x);
});

test("pointing angle: 0 = up, + = toward screen right, ±180 = down", () => {
  const f = extractFrame({ hands: [syntheticHand({ side: "right", curls: curlsForShape("OPEN"), center: { x: 1, y: 0.5 }, tilt: 30 }, ASPECT)], aspect: ASPECT, t: 0 });
  assert.ok(Math.abs(f.hands[0].pointing - 30) < 8, `pointing=${f.hands[0].pointing}`);
  const d = extractFrame({ hands: [syntheticHand({ side: "left", curls: curlsForShape("OPEN"), center: { x: 0.8, y: 0.5 }, tilt: 175 }, ASPECT)], aspect: ASPECT, t: 0 });
  assert.ok(Math.abs(d.hands[0].pointing) > 160, `down pointing=${d.hands[0].pointing}`);
});

// --- Classification --------------------------------------------------------

test("all 16 seals (12 zodiac + 4 special) are recognised under size / distance / tilt / noise variation", () => {
  assert.equal(SIGN_LIST.length, 16);
  const rec = new GestureRecognizer();
  let seed = 3;
  for (const def of SIGN_LIST) {
    const tilt = def.pointDown ? { left: 160, right: -160 } : { left: -20, right: 20 };
    const variants: PoseOptions[] = [{}, { palm: 0.09 }, { palm: 0.22 }, { noise: 0.003 }, { tilt }, { swap: true }];
    if (def.distance?.max) variants.push({ distance: 0.9 }, { distance: def.distance.max - 0.2 });
    if (def.stack === "topFirst") variants.push({ dy: 1.2 }, { dy: 2.2 });
    if (def.stack === "stacked") variants.push({ dy: 1.2 }, { dy: -1.6 });
    if (def.stack === "side") variants.push({ dy: 0.5 });
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

test("ambiguous pose (half-bent middle finger between TIGER and HORSE) is UNKNOWN", () => {
  const rec = new GestureRecognizer();
  const f = features("TIGER", { override: { left: { middle: 0.55 }, right: { middle: 0.55 } } });
  const pick = rec.pickRaw(rec.classifyGesture(f));
  assert.notEqual(pick.sign, "TIGER");
  assert.notEqual(pick.sign, "HORSE");
});

test("palms held sideways are neither MONKEY (up) nor BOAR (down)", () => {
  const rec = new GestureRecognizer();
  const pick = rec.pickRaw(rec.classifyGesture(features("MONKEY", { tilt: { left: -95, right: 95 } })));
  assert.equal(pick.sign, null, `got ${pick.sign}`);
});

test("OX (side by side) vs DOG (palm above fist) are told apart by height", () => {
  const rec = new GestureRecognizer();
  assert.equal(rec.pickRaw(rec.classifyGesture(features("OX"))).sign, "OX");
  assert.equal(rec.pickRaw(rec.classifyGesture(features("DOG"))).sign, "DOG");
  // Fist above the palm is not a Dog.
  assert.notEqual(rec.pickRaw(rec.classifyGesture(features("DOG", { dy: -1.6 }))).sign, "DOG");
});

test("one hand only → nothing recognised", () => {
  const rec = new GestureRecognizer();
  const pick = rec.pickRaw(rec.classifyGesture(features("TIGER", { only: ["right"] })));
  assert.equal(pick.sign, null);
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

test("real Great Fireball sequence Snake→Ram→Monkey→Boar→Horse→Tiger accepts each seal once", () => {
  const rec = new GestureRecognizer();
  const seq: SignId[] = ["SNAKE", "RAM", "MONKEY", "BOAR", "HORSE", "TIGER"];
  const got: SignId[] = [];
  let t = 0;
  for (const s of seq) {
    for (let i = 0; i < 20; i++) {
      const out = rec.process(syntheticFrame(poseForSign(s), (t += 33), ASPECT, t));
      if (out.accepted) got.push(out.accepted);
    }
  }
  assert.deepEqual(got, seq);
});

// --- Error mode / corrections ---------------------------------------------

test("correct pose → no correction", () => {
  for (const def of SIGN_LIST) assert.equal(getCorrection(def, features(def.id)), null, def.id);
});

test("TIGER with middle fingers curled → 'Extend your middle fingers.' (+ Russian)", () => {
  const c = correction("TIGER", "HORSE");
  assert.equal(c?.text.en, "Extend your middle fingers.");
  assert.equal(c?.text.ru, "Выпрями средние пальцы на обеих руках.");
  assert.deepEqual(c?.highlight, { side: "both", finger: "middle" });
});

test("HORSE but middle fingers up → 'Fold down your middle fingers.'", () => {
  assert.equal(en("HORSE", "TIGER"), "Fold down your middle fingers.");
});

test("TIGER with right index bent → 'Raise your right index finger.'", () => {
  const c = correction("TIGER", "TIGER", { override: { right: { index: 0.95 } } });
  assert.equal(c?.text.en, "Raise your right index finger.");
  assert.equal(c?.text.ru, "Подними указательный палец правой руки.");
  assert.deepEqual(c?.highlight, { side: "right", finger: "index" });
});

test("DRAGON with left ring finger up → 'Close your left ring finger.'", () => {
  const c = correction("DRAGON", "DRAGON", { override: { left: { ring: 0.05 } } });
  assert.equal(c?.text.en, "Close your left ring finger.");
  assert.equal(c?.text.ru, "Согни безымянный палец левой руки.");
});

test("hands too far apart → 'Bring your hands closer together.'", () => {
  assert.equal(en("TIGER", "TIGER", { distance: 4.5 }), "Bring your hands closer together.");
  assert.equal(en("SNAKE", "SNAKE", { distance: 4.5 }), "Bring your hands closer together.");
  assert.equal(correction("RAT", "RAT", { distance: 4.5 })?.text.ru, "Сведи руки ближе друг к другу.");
});

test("DOG shown as OX → 'Raise your open palm higher, above your fist.'", () => {
  const c = correction("DOG", "OX");
  assert.equal(c?.text.en, "Raise your open palm higher, above your fist.");
  assert.equal(c?.text.ru, "Подними раскрытую ладонь выше, над кулаком.");
});

test("DOG with fist on top → 'Swap heights …'", () => {
  assert.match(en("DOG", "DOG", { dy: -1.6 }) ?? "", /^Swap heights/);
});

test("OX shown stacked → 'Hold your hands side by side, at the same height.'", () => {
  assert.equal(en("OX", "DOG"), "Hold your hands side by side, at the same height.");
});

test("BOAR = tusks + fist: a fist next to an open palm is not a Boar; wrong hand shape gets a finger correction", () => {
  const rec = new GestureRecognizer();
  assert.equal(rec.pickRaw(rec.classifyGesture(features("BOAR"))).sign, "BOAR");
  assert.notEqual(rec.pickRaw(rec.classifyGesture(features("OX"))).sign, "BOAR");
  assert.ok(correction("BOAR", "RABBIT"), "Rabbit shown for Boar gets a correction");
  assert.equal(en("MONKEY", "MONKEY", { dy: 1.6 }), "Hold your hands side by side, at the same height.");
});

test("HORSE with right hand tilted outward → rotate inward", () => {
  assert.equal(en("HORSE", "HORSE", { tilt: { left: 0, right: 70 } }), "Rotate your right hand inward — fingers straight up.");
  assert.equal(en("HORSE", "HORSE", { tilt: { left: -70, right: 0 } }), "Rotate your left hand inward — fingers straight up.");
  assert.equal(en("HORSE", "HORSE", { tilt: { left: 60, right: 0 } }), "Rotate your left hand outward — fingers straight up.");
  assert.equal(correction("HORSE", "HORSE", { tilt: { left: 0, right: 70 } })?.text.ru, "Поверни правую руку внутрь — пальцы строго вверх.");
});

test("one hand missing → names the missing hand", () => {
  const c = correction("TIGER", "TIGER", { only: ["right"] });
  assert.equal(c?.text.en, "Show both hands — your left hand is out of view.");
  assert.equal(c?.text.ru, "Покажи обе руки — левой руки не видно.");
});

test("no hands → 'Move your hands into the frame.'", () => {
  assert.equal(getCorrection(SIGNS.TIGER, extractFrame({ hands: [], aspect: ASPECT, t: 0 }))?.text.en, "Move your hands into the frame.");
});

test("tiny hands → 'Move closer to the camera.'", () => {
  assert.equal(en("TIGER", "TIGER", { palm: 0.05 }), "Move closer to the camera.");
});

test("OX but two fists → whole-hand instruction to open one hand", () => {
  assert.match(en("OX", "SNAKE", { distance: 2 }) ?? "", /^Open your (left|right) hand/);
  assert.match(correction("OX", "SNAKE", { distance: 2 })?.text.ru ?? "", /^Раскрой (левую|правую) руку/);
});

test("SNAKE but both palms open → 'Close both hands into fists.'", () => {
  assert.equal(en("SNAKE", "MONKEY", { distance: 1.4 }), "Close both hands into fists.");
});

test("finger errors take priority over distance errors", () => {
  assert.equal(correction("TIGER", "HORSE", { distance: 4.5 })?.kind, "fingers");
});

run();
