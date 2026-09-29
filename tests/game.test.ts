/**
 * Game logic tests: pure reducer (quick battle + story), content integrity,
 * and an end-to-end session driven by synthetic camera frames through the
 * REAL recognizer.
 */
import assert from "node:assert/strict";
import { MISTAKE_TIME_MS, PLAYER_MAX_HP, RETALIATION, TRAIN_MASTERY, availableJutsu, dialogueLines, enemyAttack, enraged, gameReducer, initialGameState, mistakeCost, timeLimit } from "../src/lib/game/gameState";
import { JUTSU, JUTSU_LIST } from "../src/lib/game/jutsu";
import { rankFor, accuracy } from "../src/lib/game/scoring";
import { comboMultiplier } from "../src/lib/game/combo";
import { CHARACTERS, CHARACTER_LIST, damageMultiplier, randomBossFor } from "../src/lib/game/characters";
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
/** Cast `id` perfectly: picks it (loadout screen) or switches to it (countdown), then forms every seal. */
const cast = (s: GameState, id: JutsuId, dt = 1000) => {
  if (s.phase === "JUTSU_SELECTION") s = reduce(s, { type: "SELECT_JUTSU", id });
  else if (s.phase === "COUNTDOWN" && s.jutsuId !== id) s = reduce(s, { type: "SELECT_SLOT", slot: s.loadout.indexOf(id) });
  s = reduce(s, ...go);
  for (const sign of JUTSU[id].sequence) s = reduce(s, { type: "TICK", dt }, { type: "SIGN", sign });
  return reduce(s, { type: "SUCCESS_DONE" });
};

async function main() {
  await test("combo multiplier tiers", () => {
    assert.deepEqual([1, 2, 3, 4, 5, 9].map(comboMultiplier), [1, 1, 2, 2, 3, 3]);
  });

  await test("content: 12 jutsu with effects, real seal orders, no seal repeated back-to-back", () => {
    assert.equal(JUTSU_LIST.length, 12);
    assert.deepEqual(JUTSU.GOKAKYU.sequence, ["SNAKE", "RAM", "MONKEY", "BOAR", "HORSE", "TIGER"]);
    assert.deepEqual(JUTSU.CHIDORI.sequence, ["OX", "RABBIT", "MONKEY"]);
    for (const j of JUTSU_LIST) {
      for (let i = 1; i < j.sequence.length; i++) assert.notEqual(j.sequence[i], j.sequence[i - 1], `${j.id} repeats ${j.sequence[i]}`);
      for (const x of j.sequence) assert.ok(SIGNS[x], `${j.id}: unknown seal ${x}`);
      assert.ok(j.effect, `${j.id} effect`);
    }
  });

  await test("content: 13 chapters in 4 arcs, every line bilingual, every jutsu unlocked once", () => {
    assert.equal(CHAPTERS.length, 13);
    const unlocked: string[] = [];
    for (const [i, ch] of CHAPTERS.entries()) {
      assert.ok(LOCATIONS[ch.location]?.image, `chapter ${i} location art`);
      if (ch.enemy !== "mentor") assert.ok(CHARACTERS[ch.enemy], `chapter ${i} enemy ${ch.enemy}`);
      for (const l of [...ch.intro, ...ch.outro]) assert.ok(l.text.ru && l.text.en, `chapter ${i} line`);
      assert.ok(ch.taunt.ru && ch.taunt.en && ch.reply.ru && ch.reply.en);
      assert.ok(ch.intro.length >= 4, `chapter ${i} intro is a real scene`);
      unlocked.push(...ch.unlocks);
    }
    assert.deepEqual([...unlocked].sort(), [...JUTSU_LIST.map((j) => j.id)].sort());
    assert.equal(CHARACTER_LIST.length, 24);
  });

  await test("loadout: pick exactly 3 once, then rounds rotate through them with no selection screen", () => {
    let s = quick();
    assert.equal(s.phase, "JUTSU_SELECTION");
    assert.equal(availableJutsu(s).length, 12);
    s = reduce(s, { type: "CONFIRM_LOADOUT" });
    assert.equal(s.phase, "JUTSU_SELECTION", "can't start with an empty loadout");
    s = reduce(s, { type: "TOGGLE_LOADOUT", id: "CHIDORI" }, { type: "TOGGLE_LOADOUT", id: "KAWARIMI" }, { type: "TOGGLE_LOADOUT", id: "GOKAKYU" }, { type: "TOGGLE_LOADOUT", id: "RASENGAN" });
    assert.deepEqual(s.loadout, ["CHIDORI", "KAWARIMI", "GOKAKYU"], "4th pick refused");
    s = reduce(s, { type: "CONFIRM_LOADOUT" });
    assert.equal(s.phase, "COUNTDOWN");
    assert.equal(s.jutsuId, "CHIDORI");
    s = reduce(s, ...go);
    for (const sign of JUTSU.CHIDORI.sequence) s = reduce(s, { type: "TICK", dt: 1000 }, { type: "SIGN", sign });
    assert.equal(s.phase, "SUCCESS");
    assert.equal(s.stats.score, 100 + 100 + 200);
    s = reduce(s, { type: "SUCCESS_DONE" });
    assert.equal(s.lastCast?.perfect, true);
    assert.equal(s.bossHp, 1000 - Math.round(200 * 1.9), "Chidori perfect crit");
    s = reduce(s, { type: "CAST_DONE" });
    assert.equal(s.phase, "NEXT_ROUND");
    assert.equal(s.lastRound?.staggered, true, "perfect cast → no retaliation");
    assert.equal(s.playerHp, PLAYER_MAX_HP);
    s = reduce(s, { type: "NEXT_ROUND_DONE" });
    assert.equal(s.phase, "COUNTDOWN", "straight into the next round");
    assert.equal(s.jutsuId, "KAWARIMI");
    assert.equal(s.round, 2);
    s = reduce(s, { type: "SELECT_SLOT", slot: 2 });
    assert.equal(s.jutsuId, "GOKAKYU", "can switch during the countdown");
  });

  await test("a wrong seal costs chakra AND time, and invites retaliation", () => {
    let s = reduce(quick(), { type: "SELECT_JUTSU", id: "CHIDORI" }, ...go);
    const t0 = s.timeLeftMs;
    s = reduce(s, { type: "SIGN", sign: "OX" }, { type: "MISTAKE", sign: "SNAKE" });
    assert.equal(s.stats.combo, 0);
    assert.equal(s.playerHp, PLAYER_MAX_HP - mistakeCost(s));
    assert.equal(s.timeLeftMs, t0 - MISTAKE_TIME_MS);
    assert.equal(reduce(s, { type: "SELECT_SLOT", slot: 1 }), s, "committed after the first seal");
    for (const sign of JUTSU.CHIDORI.sequence.slice(1)) s = reduce(s, { type: "SIGN", sign });
    s = reduce(s, { type: "SUCCESS_DONE" });
    assert.equal(s.lastCast?.perfect, false);
    assert.equal(s.bossHp, 800);
    const hpBefore = s.playerHp;
    s = reduce(s, { type: "CAST_DONE" });
    assert.equal(s.lastRound?.staggered, false);
    assert.equal(s.playerHp, hpBefore - Math.round(enemyAttack(s) * RETALIATION));
    assert.equal(accuracy(s.stats), 3 / 4);
  });

  await test("effects: shield blocks, clones boost, fire burns, water heals, summon ticks, Kirin executes", () => {
    const withLoadout = (ids: JutsuId[]) => reduce(quick(), ...ids.map((id) => ({ type: "TOGGLE_LOADOUT", id }) as GameAction), { type: "CONFIRM_LOADOUT" });
    // Kawarimi: 2 shields → the timeout strike is blocked.
    let s = cast(withLoadout(["KAWARIMI", "CHIDORI", "GOKAKYU"]), "KAWARIMI");
    assert.equal(s.status.shield, 2);
    s = reduce(s, { type: "CAST_DONE" }, { type: "NEXT_ROUND_DONE" }, ...go, { type: "TICK", dt: 60000 });
    assert.equal(s.phase, "FAILED");
    assert.equal(s.playerHp, PLAYER_MAX_HP, "strike absorbed");
    assert.equal(s.status.shield, 1);
    // Shadow clones: next jutsu ×1.8.
    s = cast(withLoadout(["KAGE_BUNSHIN", "RASENGAN", "CHIDORI"]), "KAGE_BUNSHIN");
    s = reduce(s, { type: "CAST_DONE" }, { type: "NEXT_ROUND_DONE" });
    s = cast(s, "RASENGAN");
    assert.equal(s.lastCast?.damage, Math.round(330 * damageMultiplier(CHARACTERS.hashirama, "chakra") * 1.8 * 1.25));
    assert.equal(s.status.boost, 1, "boost consumed");
    // Fireball burns for 3 rounds.
    s = cast(withLoadout(["GOKAKYU", "CHIDORI", "RASENGAN"]), "GOKAKYU");
    const afterCast = s.bossHp;
    s = reduce(s, { type: "CAST_DONE" });
    assert.equal(s.lastRound?.burn, 70);
    assert.equal(s.bossHp, afterCast - 70);
    // Water dragon heals.
    s = withLoadout(["SUIRYUDAN", "CHIDORI", "RASENGAN"]);
    s = { ...s, playerHp: 50 };
    s = cast(s, "SUIRYUDAN");
    assert.equal(s.playerHp, 80);
    // Kirin: ×2.2 when the enemy is below 40%.
    s = withLoadout(["KIRIN", "CHIDORI", "RASENGAN"]);
    s = cast({ ...s, bossHp: 300 }, "KIRIN");
    assert.ok(s.lastCast?.tags.includes("execute"));
    assert.equal(s.bossHp, 0);
  });

  await test("timer expiry → FAILED with a counter-attack, retry restarts the same jutsu", () => {
    let s = reduce(quick(), { type: "SELECT_JUTSU", id: "GOKAKYU" }, ...go);
    s = reduce(s, { type: "SIGN", sign: "SNAKE" }, { type: "TICK", dt: 30000 });
    assert.equal(s.phase, "FAILED");
    assert.equal(s.playerHp, PLAYER_MAX_HP - enemyAttack(s));
    s = reduce(s, { type: "RETRY" });
    assert.equal(s.phase, "COUNTDOWN");
    assert.equal(s.seqIndex, 0);
    assert.equal(s.jutsuId, "GOKAKYU");
    assert.equal(s.timeLeftMs, JUTSU.GOKAKYU.timeLimitMs);
  });

  await test("soundtrack follows the scene", () => {
    assert.equal(trackFor("IDLE", 1000, 1000), null);
    assert.equal(trackFor("CHARACTER_SELECT", 1000, 1000), "menu");
    assert.equal(trackFor("DIALOGUE", 1000, 1000), "dialogue");
    assert.equal(trackFor("PLAYING", 900, 1000), "battle");
    assert.equal(trackFor("PLAYING", 300, 1000), "battle", "no mid-fight track switch");
    assert.equal(trackFor("VICTORY", 0, 1000), "victory");
  });

  await test("illegal actions are ignored", () => {
    const s = initialGameState();
    assert.equal(gameReducer(s, { type: "SIGN", sign: "TIGER" }), s);
    assert.equal(gameReducer(s, { type: "CAST_DONE" }), s);
  });

  await test("boss defeated → VICTORY; ranks; rage below 35% shortens timers and hardens hits", () => {
    let s = reduce(quick(), { type: "SELECT_JUTSU", id: "RASENSHURIKEN" });
    for (let i = 0; i < 8 && s.phase !== "VICTORY"; i++) {
      s = cast(s, s.jutsuId!, 1500);
      s = reduce(s, { type: "CAST_DONE" });
      if (s.phase === "NEXT_ROUND") s = reduce(s, { type: "NEXT_ROUND_DONE" });
      else if (s.phase !== "VICTORY") assert.fail(`unexpected ${s.phase}`);
    }
    assert.equal(s.phase, "VICTORY");
    assert.equal(s.bossHp, 0);
    assert.ok(["S", "A"].includes(rankFor(s.stats)));
    assert.equal(rankFor({ ...s.stats, mistakes: 8, playMs: 140000, failedCount: 1 }), "C");
    const calm = { ...quick(), bossHp: 900 };
    const angry = { ...calm, bossHp: 300 };
    assert.ok(enraged(angry) && !enraged(calm));
    assert.ok(enemyAttack(angry) > enemyAttack(calm));
    assert.ok(timeLimit(angry, 10000) < timeLimit(calm, 10000));
  });

  await test("character perks: time bonus, element damage; random boss is never the hero", () => {
    const naruto = reduce(menu(), { type: "SELECT_MODE", mode: "quick" }, { type: "SELECT_CHARACTER", id: "naruto" }, { type: "SELECT_JUTSU", id: "CHIDORI" });
    assert.equal(naruto.timeLeftMs, JUTSU.CHIDORI.timeLimitMs + 3000);
    const itachi = cast(reduce(menu(), { type: "SELECT_MODE", mode: "quick" }, { type: "SELECT_CHARACTER", id: "itachi" }), "RYUKA");
    assert.equal(itachi.lastCast?.damage, Math.round(280 * 1.25 * 1.25));
    for (let i = 0; i < 200; i++) {
      const b = randomBossFor("obito");
      assert.ok(b !== "obito" && b !== "obito-six-paths", b);
    }
  });

  await test("story: chapter → intro dialogue → loadout of unlocked jutsu → fight → outro → chapter list", () => {
    let s = reduce(menu(), { type: "SELECT_MODE", mode: "story" }, { type: "SELECT_CHARACTER", id: "naruto" });
    assert.equal(s.phase, "CHAPTER_SELECT");
    s = reduce(s, { type: "SELECT_CHAPTER", index: 0 });
    assert.equal(s.phase, "DIALOGUE");
    assert.equal(s.bossId, "kakashi", "mentor spars in chapter 1");
    assert.equal(s.bossMaxHp, 600);
    const n = dialogueLines(s).length;
    for (let i = 0; i < n; i++) s = reduce(s, { type: "DIALOGUE_NEXT" });
    assert.equal(s.phase, "JUTSU_SELECTION");
    assert.deepEqual(availableJutsu(s), ["HENGE", "KAWARIMI", "KAGE_BUNSHIN"]);
    assert.equal(reduce(s, { type: "TOGGLE_LOADOUT", id: "GOKAKYU" }).loadout.length, 0, "locked jutsu refused");
    s = reduce(s, { type: "TOGGLE_LOADOUT", id: "KAGE_BUNSHIN" }, { type: "TOGGLE_LOADOUT", id: "HENGE" }, { type: "TOGGLE_LOADOUT", id: "KAWARIMI" }, { type: "CONFIRM_LOADOUT" });
    let guard = 0;
    while (s.phase !== "VICTORY" && guard++ < 20) {
      s = reduce(cast(s, s.jutsuId!), { type: "CAST_DONE" });
      if (s.phase === "NEXT_ROUND") s = reduce(s, { type: "NEXT_ROUND_DONE" });
    }
    assert.equal(s.phase, "VICTORY");
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

  await test("enemy counter-attack: each failed jutsu costs chakra, empty chakra → DEFEAT → rematch", () => {
    let s = reduce(quick(), { type: "SELECT_JUTSU", id: "CHIDORI" });
    assert.equal(s.playerHp, PLAYER_MAX_HP);
    const hit = enemyAttack(s);
    let fails = 0;
    while (s.phase !== "DEFEAT" && fails < 10) {
      s = reduce(s, ...go, { type: "TICK", dt: 60000 });
      fails++;
      if (s.phase === "FAILED") {
        assert.equal(s.playerHp, PLAYER_MAX_HP - hit * fails);
        assert.equal(s.lastEnemyHit?.amount, hit);
        s = reduce(s, { type: "BACK_TO_SELECTION" });
        assert.equal(s.phase, "COUNTDOWN", "moves straight to the next jutsu");
      }
    }
    assert.equal(s.phase, "DEFEAT");
    assert.equal(s.playerHp, 0);
    assert.equal(fails, Math.ceil(PLAYER_MAX_HP / hit));
    assert.equal(reduce(s, { type: "SIGN", sign: "OX" }), s, "no input accepted after defeat");
    s = reduce(s, { type: "RESTART" });
    assert.equal(s.phase, "JUTSU_SELECTION");
    assert.equal(s.loadout.length, 3, "rematch keeps your three");
    assert.equal(s.playerHp, PLAYER_MAX_HP);
    assert.equal(s.bossHp, s.bossMaxHp);
  });

  await test("story enemies hit harder in later chapters", () => {
    const at = (ch: number) => enemyAttack({ ...initialGameState(), mode: "story", chapter: ch });
    assert.ok(at(0) < at(CHAPTERS.length - 1));
    assert.ok(Math.ceil(PLAYER_MAX_HP / at(CHAPTERS.length - 1)) >= 3, "at least 3 failures allowed even in the finale");
  });

  await test("dojo: training mode, streak → mastery, free seal choice, back to menu", () => {
    let s = reduce(menu(), { type: "SELECT_MODE", mode: "training" });
    assert.equal(s.phase, "TRAINING");
    assert.equal(s.training?.sign, "RAT");
    for (let i = 0; i < TRAIN_MASTERY; i++) s = reduce(s, { type: "TRAIN_HIT" });
    assert.deepEqual(s.training?.mastered, ["RAT"]);
    s = reduce(s, { type: "TRAIN_SELECT", sign: "DOG" });
    assert.equal(s.training?.sign, "DOG");
    assert.equal(s.training?.streak, 0);
    assert.equal(reduce(s, { type: "SELECT_JUTSU", id: "CHIDORI" }), s, "no jutsu in the dojo");
    s = reduce(s, { type: "BACK_TO_MENU" });
    assert.equal(s.phase, "MODE_SELECT");
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
    assert.ok(["JUTSU_CAST", "NEXT_ROUND", "COUNTDOWN", "PLAYING"].includes(st.phase), st.phase);
    assert.equal(st.bossHp, 1000 - 200);
    session.destroy();
  });

  await test("session dojo with synthetic camera: hold/release ×3 masters the seal and auto-advances", async () => {
    const rec = new GestureRecognizer();
    const session = new GameSession();
    session.attachRecognizer(rec);
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
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
    session.dispatch({ type: "SELECT_MODE", mode: "training" });
    session.dispatch({ type: "TRAIN_SELECT", sign: "TIGER" });
    // Wrong seal → coaching feedback, no progress.
    await hold("SNAKE", 1300);
    assert.equal(session.getState().training?.streak, 0);
    assert.ok(session.getLive().feedback, "coaching shown for a wrong seal");
    for (let i = 0; i < TRAIN_MASTERY; i++) {
      await hold("TIGER", 450);
      await hold(null, 250);
    }
    assert.ok(session.getState().training?.mastered.includes("TIGER"));
    await sleep(1200);
    assert.notEqual(session.getState().training?.sign, "TIGER", "auto-advanced to the next seal");
    session.destroy();
  });

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exit(1);
}

void main();
