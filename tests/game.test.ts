/**
 * Game logic tests: pure reducer + an end-to-end session driven by synthetic
 * camera frames through the REAL recognizer.
 */
import assert from "node:assert/strict";
import { gameReducer, initialGameState } from "../src/lib/game/gameState";
import { JUTSU } from "../src/lib/game/jutsu";
import { rankFor, accuracy } from "../src/lib/game/scoring";
import { comboMultiplier } from "../src/lib/game/combo";
import { GameSession, TIMING } from "../src/lib/game/session";
import { GestureRecognizer } from "../src/lib/vision/gestureRecognizer";
import { poseForSign, syntheticFrame } from "../src/lib/vision/syntheticHand";
import type { GameAction, GameState } from "../src/types/game";
import type { SignId } from "../src/types/gestures";

const results: { name: string; ok: boolean; err?: string }[] = [];
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false });
    console.log(`  ✗ ${name}\n    ${(e as Error).message}`);
  }
}

const reduce = (s: GameState, ...as: GameAction[]) => as.reduce(gameReducer, s);

async function main() {
  await test("combo multiplier tiers", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 9].map(comboMultiplier), [1, 1, 2, 2, 3, 3]);
  });

  await test("full reducer flow: select → countdown → seals → cast → damage", () => {
    let s = reduce(initialGameState(), { type: "START" }, { type: "CAMERA_READY" }, { type: "ENTER_SELECTION" }, { type: "SELECT_JUTSU", id: "FIRE" });
    assert.equal(s.phase, "COUNTDOWN");
    s = reduce(s, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" });
    assert.equal(s.phase, "PLAYING");
    // Wrong seal is ignored by SIGN (engine counts it via MISTAKE instead)
    s = reduce(s, { type: "SIGN", sign: "RAM" });
    assert.equal(s.seqIndex, 0);
    for (const sign of JUTSU.FIRE.sequence) s = reduce(s, { type: "TICK", dt: 1000 }, { type: "SIGN", sign });
    assert.equal(s.phase, "SUCCESS");
    assert.equal(s.stats.combo, 4);
    assert.equal(s.stats.score, 100 + 100 + 200 + 200);
    s = reduce(s, { type: "SUCCESS_DONE" });
    assert.equal(s.phase, "JUTSU_CAST");
    assert.equal(s.lastCast?.perfect, true);
    assert.equal(s.bossHp, 1000 - 375);
    s = reduce(s, { type: "CAST_DONE" });
    assert.equal(s.phase, "NEXT_ROUND");
    s = reduce(s, { type: "NEXT_ROUND_DONE" });
    assert.equal(s.phase, "JUTSU_SELECTION");
    assert.equal(s.round, 2);
  });

  await test("mistake resets combo and removes perfect bonus", () => {
    let s = reduce(initialGameState(), { type: "START" }, { type: "CAMERA_READY" }, { type: "ENTER_SELECTION" }, { type: "SELECT_JUTSU", id: "FIRE" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" });
    s = reduce(s, { type: "SIGN", sign: "TIGER" }, { type: "MISTAKE", sign: "SNAKE" });
    assert.equal(s.stats.combo, 0);
    assert.equal(s.stats.mistakes, 1);
    for (const sign of JUTSU.FIRE.sequence.slice(1)) s = reduce(s, { type: "SIGN", sign });
    s = reduce(s, { type: "SUCCESS_DONE" });
    assert.equal(s.lastCast?.perfect, false);
    assert.equal(s.bossHp, 700);
    assert.equal(accuracy(s.stats), 4 / 5);
  });

  await test("timer expiry → FAILED, retry restarts the same jutsu", () => {
    let s = reduce(initialGameState(), { type: "START" }, { type: "CAMERA_READY" }, { type: "ENTER_SELECTION" }, { type: "SELECT_JUTSU", id: "WATER" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" });
    s = reduce(s, { type: "SIGN", sign: "OX" }, { type: "TICK", dt: 20000 });
    assert.equal(s.phase, "FAILED");
    assert.equal(s.stats.failedCount, 1);
    s = reduce(s, { type: "RETRY" });
    assert.equal(s.phase, "COUNTDOWN");
    assert.equal(s.seqIndex, 0);
    assert.equal(s.timeLeftMs, JUTSU.WATER.timeLimitMs);
  });

  await test("illegal actions are ignored", () => {
    const s = initialGameState();
    assert.equal(gameReducer(s, { type: "SIGN", sign: "TIGER" }), s);
    assert.equal(gameReducer(s, { type: "CAST_DONE" }), s);
  });

  await test("boss defeated → VICTORY; ranks", () => {
    let s = reduce(initialGameState(), { type: "START" }, { type: "CAMERA_READY" }, { type: "ENTER_SELECTION" });
    for (const id of ["LIGHTNING", "LIGHTNING"] as const) {
      s = reduce(s, { type: "SELECT_JUTSU", id }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" });
      for (const sign of JUTSU[id].sequence) s = reduce(s, { type: "TICK", dt: 2000 }, { type: "SIGN", sign });
      s = reduce(s, { type: "SUCCESS_DONE" }, { type: "CAST_DONE" });
      if (s.phase === "NEXT_ROUND") s = reduce(s, { type: "NEXT_ROUND_DONE" });
    }
    assert.equal(s.phase, "VICTORY");
    assert.equal(s.bossHp, 0);
    assert.equal(rankFor(s.stats), "S");
    assert.equal(rankFor({ ...s.stats, mistakes: 6, playMs: 140000, failedCount: 1 }), "C");
  });

  await test("session end-to-end with synthetic camera: calibration → cast, with an error-mode correction", async () => {
    Object.assign(TIMING, { readyToSelection: 20, countdownStep: 20, successCharge: 20, castImpact: 5, castDuration: 20, nextRound: 20, calibrationHold: 150 });
    const rec = new GestureRecognizer();
    const session = new GameSession();
    session.attachRecognizer(rec);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const feedbacks: string[] = [];
    session.subscribeLive(() => {
      const f = session.getLive().feedback;
      if (f && feedbacks[feedbacks.length - 1] !== f.message) feedbacks.push(`${f.tone}:${f.title}:${f.message}`);
    });

    const hold = async (sign: SignId | null, ms: number, opts = {}) => {
      const end = performance.now() + ms;
      while (performance.now() < end) {
        const t = performance.now();
        const raw = sign ? syntheticFrame(poseForSign(sign, opts), t, 16 / 9, Math.floor(t)) : { hands: [], aspect: 16 / 9, t };
        session.onFrame(rec.process(raw));
        await sleep(16);
      }
    };

    session.dispatch({ type: "START" });
    await hold("HORSE", 300);
    assert.equal(session.getState().phase === "READY" || session.getState().phase === "JUTSU_SELECTION", true, session.getState().phase);
    await sleep(60);
    assert.equal(session.getState().phase, "JUTSU_SELECTION");
    session.dispatch({ type: "SELECT_JUTSU", id: "FIRE" });
    await sleep(120);
    assert.equal(session.getState().phase, "PLAYING");

    await hold("TIGER", 450);
    assert.equal(session.getState().seqIndex, 1, "TIGER accepted");
    // Player makes the WRONG seal (SNAKE instead of RAM) — should be counted and corrected.
    await hold("SNAKE", 900);
    assert.equal(session.getState().stats.mistakes, 1, "mistake counted once");
    const err = feedbacks.find((f) => f.startsWith("error:"));
    assert.ok(err, `error feedback shown: ${feedbacks.join(" | ")}`);
    assert.match(err!, /THAT'S SNAKE/);
    assert.match(err!, /index fingers|Raise|Extend/);
    await hold("RAM", 450);
    await hold("SNAKE", 450);
    await hold("HORSE", 450);
    await sleep(80);
    const st = session.getState();
    assert.ok(["JUTSU_CAST", "NEXT_ROUND", "JUTSU_SELECTION"].includes(st.phase), st.phase);
    assert.equal(st.bossHp, 700);
    session.destroy();
  });

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exit(1);
}

void main();
