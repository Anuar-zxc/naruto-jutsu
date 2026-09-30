/**
 * GET  /api/leaderboard?board=survival|daily:YYYY-MM-DD → top 25
 * POST /api/leaderboard { board, nick, score, hero }   → keeps the best score per nick
 *
 * Storage: Upstash Redis over its REST API (free tier; add it in Vercel →
 * Storage → Upstash for Redis, which sets KV_REST_API_URL / KV_REST_API_TOKEN).
 * Without it the board lives in this server instance's memory (resets on redeploy).
 */
import { cleanNick } from "@/lib/game/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BOARD_RE = /^(survival|daily:\d{4}-\d{2}-\d{2})$/;
const MAX_SCORE: Record<string, number> = { survival: 500, daily: 500000 };
const TOP = 25;

const REST_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REST_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
const persistent = !!(REST_URL && REST_TOKEN);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function redis(cmds: (string | number)[][]): Promise<unknown[]> {
  const r = await fetch(`${REST_URL}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${REST_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(cmds),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const out = (await r.json()) as { result?: unknown; error?: string }[];
  return out.map((x) => x.result);
}

// In-memory fallback.
const mem = new Map<string, Map<string, { score: number; hero: string }>>();

// Tiny per-instance rate limit: 12 writes / minute / IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 12;
}

const cleanHero = (h: unknown) => (typeof h === "string" ? h.replace(/[^a-z0-9-]/g, "").slice(0, 32) : "") || "naruto";

export async function GET(req: Request) {
  const board = new URL(req.url).searchParams.get("board") ?? "";
  if (!BOARD_RE.test(board)) return json({ error: "board" }, 400);
  try {
    if (persistent) {
      const [flat] = await redis([["ZREVRANGE", `lb:${board}`, 0, TOP - 1, "WITHSCORES"]]);
      const arr = Array.isArray(flat) ? (flat as string[]) : [];
      const nicks = arr.filter((_, i) => i % 2 === 0);
      const heroes = nicks.length ? ((await redis([["HMGET", `lbh:${board}`, ...nicks]]))[0] as (string | null)[]) : [];
      const entries = nicks.map((nick, i) => ({ nick, score: Number(arr[i * 2 + 1]), hero: heroes[i] ?? "naruto" }));
      return json({ board, entries, persistent });
    }
    const m = mem.get(board) ?? new Map();
    const entries = [...m.entries()].map(([nick, v]) => ({ nick, ...v })).sort((a, b) => b.score - a.score).slice(0, TOP);
    return json({ board, entries, persistent });
  } catch {
    return json({ board, entries: [], persistent, error: "storage" }, 200);
  }
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return json({ ok: false, reason: "rate" }, 429);
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false }, 400);
  }
  const board = typeof body.board === "string" ? body.board : "";
  const nick = typeof body.nick === "string" ? cleanNick(body.nick) : "";
  const score = typeof body.score === "number" && Number.isFinite(body.score) ? Math.floor(body.score) : -1;
  const max = MAX_SCORE[board.split(":")[0]] ?? 0;
  if (!BOARD_RE.test(board) || !nick || score <= 0 || score > max) return json({ ok: false }, 400);
  const hero = cleanHero(body.hero);
  try {
    if (persistent) {
      const key = `lb:${board}`;
      const cmds: (string | number)[][] = [
        ["ZADD", key, "GT", score, nick],
        ["HSET", `lbh:${board}`, nick, hero],
      ];
      // Daily boards expire after a week.
      if (board.startsWith("daily:")) cmds.push(["EXPIRE", key, 7 * 86400], ["EXPIRE", `lbh:${board}`, 7 * 86400]);
      await redis(cmds);
    } else {
      const m = mem.get(board) ?? new Map<string, { score: number; hero: string }>();
      const prev = m.get(nick);
      if (!prev || score > prev.score) m.set(nick, { score, hero });
      mem.set(board, m);
      if (mem.size > 60) mem.delete(mem.keys().next().value as string);
    }
    return json({ ok: true, persistent });
  } catch {
    return json({ ok: false, reason: "storage" }, 200);
  }
}
