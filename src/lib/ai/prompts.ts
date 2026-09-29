/**
 * Prompt building for the AI sensei / villain voices (alem.plus LLM).
 *
 * Shared by the server route (which builds the real prompt) and the tests.
 * The browser only sends a small, validated description of the game moment —
 * never free-form prompts — so the API key can't be used as an open proxy.
 */
import type { Lang } from "@/types/i18n";

export type SenseiKind = "taunt" | "review" | "dojo";

export interface SenseiRequest {
  kind: SenseiKind;
  lang: Lang;
  /** Display names, already localised. */
  hero?: string;
  villain?: string;
  mentor?: string;
  /** taunt: what just happened. */
  event?: "failed" | "lowhp";
  /** review */
  outcome?: "victory" | "defeat";
  stats?: { accuracy: number; maxCombo: number; mistakes: number; casts: number; perfect: number; score: number; rank: string; seconds: number };
  /** review: weakest seals, e.g. [{ name: "Тигр", howTo: "...", n: 3 }] */
  weak?: { name: string; howTo: string; n: number }[];
  /** taunt/review: jutsu involved */
  jutsu?: string;
  /** dojo: the seal being practised and the last correction shown */
  seal?: { name: string; howTo: string };
  correction?: string;
}

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const clip = (v: unknown, n = 60) => (typeof v === "string" ? v.replace(/[\u0000-\u001f<>{}]/g, " ").trim().slice(0, n) : "");
const num = (v: unknown, lo = 0, hi = 1e7) => (typeof v === "number" && Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : 0);

/** Validate & normalise an untrusted request body. Returns null if unusable. */
export function sanitize(body: unknown): SenseiRequest | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const kind = b.kind;
  if (kind !== "taunt" && kind !== "review" && kind !== "dojo") return null;
  const lang: Lang = b.lang === "en" ? "en" : "ru";
  const s = (b.stats ?? {}) as Record<string, unknown>;
  const weak = Array.isArray(b.weak)
    ? b.weak.slice(0, 3).map((w) => ({ name: clip((w as Record<string, unknown>)?.name, 24), howTo: clip((w as Record<string, unknown>)?.howTo, 120), n: num((w as Record<string, unknown>)?.n, 0, 99) }))
    : [];
  const seal = b.seal && typeof b.seal === "object" ? { name: clip((b.seal as Record<string, unknown>).name, 24), howTo: clip((b.seal as Record<string, unknown>).howTo, 120) } : undefined;
  return {
    kind,
    lang,
    hero: clip(b.hero, 40),
    villain: clip(b.villain, 40),
    mentor: clip(b.mentor, 40),
    event: b.event === "lowhp" ? "lowhp" : "failed",
    outcome: b.outcome === "defeat" ? "defeat" : "victory",
    stats: {
      accuracy: num(s.accuracy, 0, 100),
      maxCombo: num(s.maxCombo, 0, 999),
      mistakes: num(s.mistakes, 0, 999),
      casts: num(s.casts, 0, 999),
      perfect: num(s.perfect, 0, 999),
      score: num(s.score),
      rank: clip(s.rank, 2) || "C",
      seconds: num(s.seconds, 0, 99999),
    },
    weak,
    jutsu: clip(b.jutsu, 40),
    seal,
    correction: clip(b.correction, 140),
  };
}

const LANG_RULE: Record<Lang, string> = {
  ru: "Отвечай ТОЛЬКО на русском языке.",
  en: "Answer ONLY in English.",
};

/** Build chat messages + generation limits for a request. */
export function buildPrompt(r: SenseiRequest): { messages: ChatMessage[]; maxTokens: number; temperature: number } {
  const common =
    "You write short in-game lines for SHINOBI — JUTSU, a webcam game where the player forms ninja hand seals with their real hands. " +
    "Never use emojis, markdown, lists, hashtags or quotation marks around the whole answer. No stage directions. " +
    LANG_RULE[r.lang];

  if (r.kind === "taunt") {
    const situation =
      r.event === "lowhp"
        ? `The player (${r.hero || "a young shinobi"}) has just knocked you below half health.`
        : `The player (${r.hero || "a young shinobi"}) was too slow forming the seals${r.jutsu ? ` for ${r.jutsu}` : ""}, the jutsu failed and you just hit them back.`;
    return {
      messages: [
        { role: "system", content: `${common} You are ${r.villain || "a villain"}, speaking in character: arrogant, dramatic, a little theatrical, but PG-13 — no slurs, no real-world insults.` },
        { role: "user", content: `${situation} Say ONE taunting line to the player, at most 16 words.` },
      ],
      maxTokens: 70,
      temperature: 1.0,
    };
  }

  if (r.kind === "dojo") {
    return {
      messages: [
        { role: "system", content: `${common} You are ${r.mentor || "the sensei"}, a warm, witty ninja teacher.` },
        {
          role: "user",
          content:
            `The student is practising the ${r.seal?.name ?? "?"} seal (${r.seal?.howTo ?? ""}) in front of a webcam.` +
            (r.correction ? ` The camera coach just told them: "${r.correction}".` : "") +
            " Give ONE practical tip in 2 short sentences: how to hold the hands so the camera reads it clearly, plus a fun memory hook for this seal. Max 40 words.",
        },
      ],
      maxTokens: 140,
      temperature: 0.8,
    };
  }

  // review
  const st = r.stats!;
  const weak = r.weak?.length ? r.weak.map((w) => `${w.name} (${w.n} mistakes; correct form: ${w.howTo})`).join("; ") : "none";
  return {
    messages: [
      { role: "system", content: `${common} You are ${r.mentor || "the sensei"}, the player's mentor, giving a quick post-battle debrief. Be specific, encouraging and a bit playful.` },
      {
        role: "user",
        content:
          `Battle: ${r.hero || "the student"} vs ${r.villain || "a villain"} — ${r.outcome === "defeat" ? "the student LOST" : "the student WON"}. ` +
          `Rank ${st.rank}, score ${st.score}, seal accuracy ${Math.round(st.accuracy)}%, max combo ${st.maxCombo}, jutsu cast ${st.casts} (${st.perfect} perfect), mistakes ${st.mistakes}, time forming seals ${Math.round(st.seconds)}s. ` +
          `Seals with mistakes: ${weak}. ` +
          "Write 3 short sentences (max 60 words total): 1) react to the result in character, 2) name the weakest seal and exactly how to fix the hands (or, if there were no mistakes, what to push next — speed or combo), 3) a motivating send-off.",
      },
    ],
    maxTokens: 220,
    temperature: 0.8,
  };
}

/** Clean up model output: strip wrapping quotes/markdown, cap the length. */
export function cleanReply(text: unknown, max = 420): string | null {
  if (typeof text !== "string") return null;
  let s = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/[*_#`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  s = s.replace(/^["«“'](.*)["»”']$/s, "$1").trim();
  if (!s) return null;
  if (s.length > max) {
    const cut = s.slice(0, max);
    const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    s = end > max * 0.5 ? cut.slice(0, end + 1) : cut.trimEnd() + "…";
  }
  return s;
}
