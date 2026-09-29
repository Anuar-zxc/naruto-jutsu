/**
 * POST /api/sensei — AI voices for the game, powered by the alem.plus LLM.
 *
 * The API key lives only on the server (env ALEM_API_KEY). The browser sends a
 * small structured description of the game moment; the prompt is built here.
 * Any failure returns { text: null } and the game falls back to built-in lines.
 */
import { buildPrompt, cleanReply, sanitize } from "@/lib/ai/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.ALEM_API_URL || "https://llm.alem.ai/v1/chat/completions";
const MODEL = process.env.ALEM_MODEL || "alemllm";
const TIMEOUT_MS = 12000;

// Tiny per-instance rate limit: 20 requests / minute / IP.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 20;
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function GET() {
  return json({ enabled: !!process.env.ALEM_API_KEY, model: MODEL });
}

export async function POST(req: Request) {
  const key = process.env.ALEM_API_KEY;
  if (!key) return json({ text: null, reason: "disabled" });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (limited(ip)) return json({ text: null, reason: "rate" }, 429);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ text: null, reason: "bad-json" }, 400);
  }
  const r = sanitize(body);
  if (!r) return json({ text: null, reason: "bad-request" }, 400);

  const { messages, maxTokens, temperature } = buildPrompt(r);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature, stream: false }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error("[sensei] upstream", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return json({ text: null, reason: `upstream-${res.status}` }, 502);
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string }; text?: string }[] };
    const raw = data.choices?.[0]?.message?.content ?? data.choices?.[0]?.text;
    const text = cleanReply(raw, r.kind === "taunt" ? 160 : 460);
    return json({ text });
  } catch (e) {
    console.error("[sensei] error", (e as Error).message);
    return json({ text: null, reason: "error" }, 504);
  } finally {
    clearTimeout(timer);
  }
}
