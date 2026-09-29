/**
 * AI sensei tests: request sanitising, prompt building, reply cleanup, and the
 * /api/sensei route against a stubbed alem.plus endpoint (no network).
 */
import assert from "node:assert/strict";
import { buildPrompt, cleanReply, sanitize } from "../src/lib/ai/prompts";
import { localReview, reviewRequest, weakSeals } from "../src/lib/ai/sensei";
import { gameReducer, initialGameState } from "../src/lib/game/gameState";
import { setLang } from "../src/lib/i18n";
import type { GameAction, GameState } from "../src/types/game";

const results: boolean[] = [];
async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    results.push(true);
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push(false);
    console.log(`  ✗ ${name}\n    ${(e as Error).message}`);
  }
}
const reduce = (s: GameState, ...as: GameAction[]) => as.reduce(gameReducer, s);

async function main() {
  await test("sanitize rejects junk and clips strings", () => {
    assert.equal(sanitize(null), null);
    assert.equal(sanitize({ kind: "hack" }), null);
    const r = sanitize({ kind: "taunt", lang: "xx", villain: "Madara".repeat(20) + "<script>", stats: { accuracy: 500 } })!;
    assert.equal(r.lang, "ru");
    assert.ok(r.villain!.length <= 40 && !r.villain!.includes("<"));
    assert.equal(r.stats!.accuracy, 100);
  });

  await test("prompts: language rule, villain voice, review includes weak seal", () => {
    const t = buildPrompt(sanitize({ kind: "taunt", lang: "en", villain: "Pain", hero: "Naruto", event: "failed" })!);
    assert.match(t.messages[0].content, /Answer ONLY in English/);
    assert.match(t.messages[0].content, /You are Pain/);
    const r = buildPrompt(sanitize({ kind: "review", lang: "ru", mentor: "Какаши", weak: [{ name: "Тигр", howTo: "указательные и средние вверх", n: 3 }], stats: { accuracy: 75, rank: "B" } })!);
    assert.match(r.messages[0].content, /русском/);
    assert.match(r.messages[1].content, /Тигр \(3 mistakes/);
    assert.ok(r.maxTokens <= 300);
  });

  await test("cleanReply strips quotes/markdown/think blocks and caps length", () => {
    assert.equal(cleanReply('<think>hmm</think> "**Ты слишком медленный!**"'), "Ты слишком медленный!");
    assert.equal(cleanReply(""), null);
    assert.equal(cleanReply(42), null);
    const long = cleanReply("Раз. ".repeat(200), 100)!;
    assert.ok(long.length <= 101);
  });

  await test("weak seals + offline review come from real fight stats", () => {
    setLang("ru");
    let s = reduce(initialGameState(), { type: "START" }, { type: "CAMERA_READY" }, { type: "ENTER_SELECTION" }, { type: "SELECT_MODE", mode: "quick" }, { type: "SELECT_CHARACTER", id: "naruto", bossId: "pain" });
    s = reduce(s, { type: "SELECT_JUTSU", id: "CHIDORI" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" }, { type: "COUNTDOWN_TICK" });
    s = reduce(s, { type: "SIGN", sign: "OX" }, { type: "MISTAKE", sign: "SNAKE" }, { type: "MISTAKE", sign: "TIGER" });
    assert.deepEqual(s.stats.weak, { RABBIT: 2 });
    assert.equal(weakSeals(s)[0].name, "Кролик");
    const req = reviewRequest(s, "defeat");
    assert.equal(req.weak?.[0].n, 2);
    assert.equal(req.villain, "Пейн");
    assert.match(localReview(s, "defeat"), /Кролик/);
  });

  await test("route: disabled without key, calls alem with Bearer + alemllm, cleans reply", async () => {
    const route = await import("../src/app/api/sensei/route");
    delete process.env.ALEM_API_KEY;
    const post = (body: unknown) => route.POST(new Request("http://x/api/sensei", { method: "POST", body: JSON.stringify(body), headers: { "x-forwarded-for": "1.2.3.4" } }));
    let res = await (await post({ kind: "taunt", lang: "ru" })).json();
    assert.equal(res.reason, "disabled");

    process.env.ALEM_API_KEY = "sk-test";
    const realFetch = globalThis.fetch;
    let seen: { url: string; auth: string | null; body: { model: string; messages: { content: string }[] } } | null = null;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      seen = { url, auth: new Headers(init.headers).get("authorization"), body: JSON.parse(String(init.body)) };
      return new Response(JSON.stringify({ choices: [{ message: { content: '"Твоя чакра — пыль."' } }] }), { status: 200 });
    }) as typeof fetch;
    try {
      res = await (await post({ kind: "taunt", lang: "ru", villain: "Мадара", event: "failed" })).json();
      assert.equal(res.text, "Твоя чакра — пыль.");
      assert.equal(seen!.url, "https://llm.alem.ai/v1/chat/completions");
      assert.equal(seen!.auth, "Bearer sk-test");
      assert.equal(seen!.body.model, "alemllm");
      assert.match(seen!.body.messages[0].content, /Мадара/);

      globalThis.fetch = (async () => new Response("nope", { status: 401 })) as typeof fetch;
      const r401 = await post({ kind: "dojo", lang: "en", seal: { name: "Tiger", howTo: "x" } });
      assert.equal(r401.status, 502);
      assert.equal((await r401.json()).text, null);

      const bad = await post({ kind: "whatever" });
      assert.equal(bad.status, 400);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  const failed = results.filter((x) => !x).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) process.exit(1);
}
void main();
