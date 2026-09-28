/**
 * Game logic tests: pure reducer (quick battle + story), content integrity,
 * and an end-to-end session driven by synthetic camera frames through the
 * REAL recognizer.
 */
import assert from "node:assert/strict";
import { availableJutsu, dialogueLines, gameReducer, initialGameState } from "../src/lib/game/gameState";
import { JUTSU, JUTSU_LIST } from "../src/lib/game/jutsu";
import { rankFor, accuracy } from "../src/lib/game/scoring";
import { comboMultiplier } from "../src/lib/game/combo";
import { CHARACTERS, CHARACTER_LIST, randomBossFor } from "../src/lib/game/characters";
import { CHAPTERS } from "../src/lib/game/story";
import { LOCATIONS } from "../src/lib/game/locations";
import { GameSession, TIMING } from "../src/lib/game/session";
import { GestureRecognizer } from "../src/lib/vision/gestureRecognizer";
import { SIGNS } from "../src/lib/vision/gestureDefinitions";
import { poseForSign, syntheticFrame } from "../src/lib/vision/syntheticHand";
import { setLang } from "../src/lib/i18n";
import { trackFor } from "../src/lib/audio/music";
import type { GameAction, GameState, JutsuId } from "../src/types/game";
import type { SignId } from "../src/types/gestures";

const results: { name: string; ok: boolean }[] = [];
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
const menu = () => reduce(initialGameState(), { type: "START" }, { type: "CAMERA_READY" }, { type: "ENTER_SELECTION" });
const quick = (hero = "hashirama" as const, bossId = "pain" as const) =>
  reduce(menu(), { type: "SELECT_MODE", mode: "quick" }, { type: "SELECT_CHARACTER", id: hero, bossId });
const go: GameAction[] = [{ type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }];
const cast = (s: GameState, id: JutsuId, dt = 1000) => {
  s = reduce(s, { type: "SELECT_JUTSU", id }, ...go);
  for (const sign of JUTSU[id].sequence) s = reduce(s, { type: "TICK", dt }, { type: "SIGN", sign });
  return reduce(s, { type: "SUCCESS_DONE" });
};

async function main() {
  await test("combo multiplier tiers", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 9].map(comboMultiplier), [1, 1, 2, 2, 3, 3]);
  });

  await test("content: 9 jutsu with real seal orders, no seal repeated back-to-back", () => {
    assert.equal(JUTSU_LIST.length, 9);
    assert.deepEqual(JUTSU.GOKAKYU.sequence, ["SNAKE", "RAM", "MONKEY", "BOAR", "HORSE", "TIGER"]);
    assert.deepEqual(JUTSU.CHIDORI.sequence, ["OX", "RABBIT", "MONKEY"]);
    assert.deepEqual(JUTSU.HOSENKA.sequence, ["RAT", "TIGER", "DOG", "OX", "RABBIT", "TIGER"]);
    for (const j of JUTSU_LIST) {
      for (let i = 1; i < j.sequence.length; i++) assert.notEqual(j.sequence[i], j.sequence[i - 1], `${j.id} repeats ${j.sequence[i]}`);
      for (const s of j.sequence) assert.ok(SIGNS[s], `${j.id}: unknown seal ${s}`);
    }
  });

  await test("content: 12 chapters, every line bilingual, every enemy/location exists", () => {
    assert.equal(CHAPTERS.length, 12);
    for (const [i, ch] of CHAPTERS.entries()) {
      assert.ok(LOCATIONS[ch.location], `chapter ${i} location`);
      if (ch.enemy !== "mentor") assert.ok(CHARACTERS[ch.enemy]?.villain, `chapter ${i} enemy ${ch.enemy}`);
      for (const l of [...ch.intro, ...ch.outro]) assert.ok(l.text.ru && l.text.en, `chapter ${i} line`);
      assert.ok(ch.taunt.ru && ch.taunt.en);
    }
    assert.equal(CHARACTER_LIST.length, 24);
  });

  await test("quick battle: menu → hero → jutsu → seals → cast → damage", () => {
    let s = menu();
    assert.equal(s.phase, "MODE_SELECT");
    s = quick();
    assert.equal(s.phase, "JUTSU_SELECTION");
    assert.equal(s.bossId, "pain");
    assert.equal(availableJutsu(s).length, 9);
    s = reduce(s, { type: "SELECT_JUTSU", id: "CHIDORI" }, ...go);
    assert.equal(s.phase, "PLAYING");
    s = reduce(s, { type: "SIGN", sign: "RAM" });
    assert.equal(s.seqIndex, 0, "wrong seal ignored by SIGN");
    for (const sign of JUTSU.CHIDORI.sequence) s = reduce(s, { type: "TICK", dt: 1000 }, { type: "SIGN", sign });
    assert.equal(s.phase, "SUCCESS");
    assert.equal(s.stats.score, 100 + 100 + 200);
    s = reduce(s, { type: "SUCCESS_DONE" });
    assert.equal(s.lastCast?.perfect, true);
    assert.equal(s.bossHp, 1000 - Math.round(220 * 1.25));
    s = reduce(s, { type: "CAST_DONE" }, { type: "NEXT_ROUND_DONE" });
    assert.equal(s.phase, "JUTSU_SELECTION");
    assert.equal(s.round, 2);
  });

  await test("mistake resets combo and removes perfect bonus", () => {
    let s = reduce(quick(), { type: "SELECT_JUTSU", id: "CHIDORI" }, ...go);
    s = reduce(s, { type: "SIGN", sign: "OX" }, { type: "MISTAKE", sign: "SNAKE" });
    assert.equal(s.stats.combo, 0);
    for (const sign of JUTSU.CHIDORI.sequence.slice(1)) s = reduce(s, { type: "SIGN", sign });
    s = reduce(s, { type: "SUCCESS_DONE" });
    assert.equal(s.lastCast?.perfect, false);
    assert.equal(s.bossHp, 780);
    assert.equal(accuracy(s.stats), 3 / 4);
  });

  await test("timer expiry → FAILED, retry restarts the same jutsu", () => {
    let s = reduce(quick(), { type: "SELECT_JUTSU", id: "GOKAKYU" }, ...go);
    s = reduce(s, { type: "SIGN", sign: "SNAKE" }, { type: "TICK", dt: 30000 });
    assert.equal(s.phase, "FAILED");
    s = reduce(s, { type: "RETRY" });
    assert.equal(s.phase, "COUNTDOWN");
    assert.equal(s.seqIndex, 0);
    assert.equal(s.timeLeftMs, JUTSU.GOKAKYU.timeLimitMs);
  });

  await test("soundtrack follows the scene", () => {
    assert.equal(trackFor("IDLE", 1000, 1000), null);
    assert.equal(trackFor("CHARACTER_SELECT", 1000, 1000), "menu");
    assert.equal(trackFor("DIALOGUE", 1000, 1000), "dialogue");
    assert.equal(trackFor("PLAYING", 900, 1000), "battle");
    assert.equal(trackFor("PLAYING", 300, 1000), "boss");
    assert.equal(trackFor("VICTORY", 0, 1000), "victory");
  });

  await test("illegal actions are ignored", () => {
    const s = initialGameState();
    assert.equal(gameReducer(s, { type: "SIGN", sign: "TIGER" }), s);
    assert.equal(gameReducer(s, { type: "CAST_DONE" }), s);
  });

  await test("boss defeated → VICTORY; ranks", () => {
    let s = quick();
    for (let i = 0; i < 4 && s.phase !== "VICTORY"; i++) {
      s = cast(s, "GOKAKYU", 2000);
      s = reduce(s, { type: "CAST_DONE" });
      if (s.phase === "NEXT_ROUND") s = reduce(s, { type: "NEXT_ROUND_DONE" });
    }
    assert.equal(s.phase, "VICTORY");
    assert.equal(s.bossHp, 0);
    assert.equal(rankFor(s.stats), "S");
    assert.equal(rankFor({ ...s.stats, mistakes: 8, playMs: 140000, failedCount: 1 }), "C");
  });

  await test("character perks: time bonus, element damage; random boss is never the hero", () => {
    const naruto = reduce(menu(), { type: "SELECT_MODE", mode: "quick" }, { type: "SELECT_CHARACTER", id: "naruto" }, { type: "SELECT_JUTSU", id: "CHIDORI" });
    assert.equal(naruto.timeLeftMs, JUTSU.CHIDORI.timeLimitMs + 3000);
    const itachi = cast(reduce(menu(), { type: "SELECT_MODE", mode: "quick" }, { type: "SELECT_CHARACTER", id: "itachi" }), "RYUKA");
    assert.equal(itachi.lastCast?.damage, Math.round(300 * 1.25 * 1.25));
    for (let i = 0; i < 200; i++) {
      const b = randomBossFor("obito");
      assert.ok(b !== "obito" && b !== "obito-six-paths", b);
    }
  });

  await test("story: chapter → intro dialogue → fight with unlocked jutsu → outro → chapter list", () => {
    let s = reduce(menu(), { type: "SELECT_MODE", mode: "story" }, { type: "SELECT_CHARACTER", id: "naruto" });
    assert.equal(s.phase, "CHAPTER_SELECT");
    s = reduce(s, { type: "SELECT_CHAPTER", index: 0 });
    assert.equal(s.phase, "DIALOGUE");
    assert.equal(s.bossId, "kakashi", "mentor spars in chapter 1");
    assert.equal(s.bossMaxHp, 500);
    const n = dialogueLines(s).length;
    for (let i = 0; i < n; i++) s = reduce(s, { type: "DIALOGUE_NEXT" });
    assert.equal(s.phase, "JUTSU_SELECTION");
    assert.deepEqual(availableJutsu(s), ["HENGE", "KAWARIMI", "KAGE_BUNSHIN"]);
    assert.equal(reduce(s, { type: "SELECT_JUTSU", id: "GOKAKYU" }).phase, "JUTSU_SELECTION", "locked jutsu refused");
    while (s.phase !== "VICTORY") {
      s = reduce(cast(s, "KAGE_BUNSHIN"), { type: "CAST_DONE" });
      if (s.phase === "NEXT_ROUND") s = reduce(s, { type: "NEXT_ROUND_DONE" });
    }
    s = reduce(s, { type: "STORY_OUTRO" });
    assert.equal(s.phase, "DIALOGUE");
    assert.equal(s.dialogue?.part, "outro");
    s = reduce(s, { type: "DIALOGUE_SKIP" });
    assert.equal(s.phase, "CHAPTER_SELECT");
    s = reduce(s, { type: "SELECT_CHAPTER", index: 1 }, { type: "DIALOGUE_SKIP" });
    assert.equal(s.bossId, "kisame");
    assert.ok(availableJutsu(s).includes("GOKAKYU"));
    const kak = reduce(menu(), { type: "SELECT_MODE", mode: "story" }, { type: "SELECT_CHARACTER", id: "kakashi" }, { type: "SELECT_CHAPTER", index: 0 });
    assert.equal(kak.bossId, "jiraiya", "mentor is never the player");
  });

  await test("session end-to-end with synthetic camera: calibration → Chidori with an error-mode correction", async () => {
    setLang("en");
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
    const hold = async (sign: SignId | null, ms: number) => {
      const end = performance.now() + ms;
      while (performance.now() < end) {
        const t = performance.now();
        const raw = sign ? syntheticFrame(poseForSign(sign), t, 16 / 9, Math.floor(t)) : { hands: [], aspect: 16 / 9, t };
        session.onFrame(rec.process(raw));
        await sleep(16);
      }
    };

    session.dispatch({ type: "START" });
    await hold("MONKEY", 300);
    await sleep(60);
    assert.equal(session.getState().phase, "MODE_SELECT");
    session.dispatch({ type: "SELECT_MODE", mode: "quick" });
    session.dispatch({ type: "SELECT_CHARACTER", id: "hashirama", bossId: "madara" });
    session.dispatch({ type: "SELECT_JUTSU", id: "CHIDORI" });
    await sleep(120);
    assert.equal(session.getState().phase, "PLAYING");

    await hold("OX", 450);
    assert.equal(session.getState().seqIndex, 1, "OX accepted");
    // Wrong seal: SNAKE (two fists) instead of RABBIT (index + fist).
    await hold("SNAKE", 900);
    assert.equal(session.getState().stats.mistakes, 1, "mistake counted once");
    const err = feedbacks.find((f) => f.startsWith("error:"));
    assert.ok(err, `error feedback shown: ${feedbacks.join(" | ")}`);
    assert.match(err!, /THAT'S SNAKE/);
    assert.match(err!, /index finger/);
    await hold("RABBIT", 450);
    await hold("MONKEY", 450);
    await sleep(80);
    const st = session.getState();
    assert.ok(["JUTSU_CAST", "NEXT_ROUND", "JUTSU_SELECTION"].includes(st.phase), st.phase);
    assert.equal(st.bossHp, 1000 - 220);
    session.destroy();
  });

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exit(1);
}

void main();
