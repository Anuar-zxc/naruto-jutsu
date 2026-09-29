/**
 * Browser side of the AI sensei: builds structured requests from game state,
 * calls /api/sensei, and always has an offline fallback so the game never
 * waits on the network.
 */
import type { GameState } from "@/types/game";
import type { SignId } from "@/types/gestures";
import type { SenseiRequest } from "./prompts";
import { CHARACTERS, mentorFor } from "@/lib/game/characters";
import { JUTSU } from "@/lib/game/jutsu";
import { accuracy, rankFor } from "@/lib/game/scoring";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import { getLang, tr } from "@/lib/i18n";

let failures = 0;
const cache = new Map<string, string>();

/** Ask the AI. Resolves to null on any problem (offline, no key, slow...). */
export async function askSensei(req: SenseiRequest, timeoutMs = 9000): Promise<string | null> {
  if (failures >= 3) return null; // stop hammering a dead endpoint for this session
  const key = JSON.stringify(req);
  if (req.kind !== "taunt" && cache.has(key)) return cache.get(key)!;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/sensei", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: key,
      signal: ctrl.signal,
    });
    const data = (await res.json().catch(() => null)) as { text?: string | null; reason?: string } | null;
    if (data?.reason === "disabled") failures = 99;
    const text = typeof data?.text === "string" && data.text ? data.text : null;
    if (text) {
      failures = 0;
      cache.set(key, text);
    } else failures++;
    return text;
  } catch {
    failures++;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const name = (id: GameState["bossId"]) => (id ? tr(CHARACTERS[id].name) : undefined);

export function weakSeals(g: GameState) {
  return (Object.entries(g.stats.weak) as [SignId, number][])
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, n]) => ({ id, name: tr(SIGNS[id].name), howTo: tr(SIGNS[id].howTo), n }));
}

export function tauntRequest(g: GameState, event: "failed" | "lowhp"): SenseiRequest {
  return {
    kind: "taunt",
    lang: getLang(),
    event,
    hero: name(g.characterId),
    villain: name(g.bossId),
    jutsu: g.jutsuId ? tr(JUTSU[g.jutsuId].name) : undefined,
  };
}

export function reviewRequest(g: GameState, outcome: "victory" | "defeat"): SenseiRequest {
  const s = g.stats;
  return {
    kind: "review",
    lang: getLang(),
    outcome,
    hero: name(g.characterId),
    villain: name(g.bossId),
    mentor: name(mentorFor(g.characterId)),
    stats: {
      accuracy: Math.round(accuracy(s) * 100),
      maxCombo: s.maxCombo,
      mistakes: s.mistakes,
      casts: s.castCount,
      perfect: s.perfectCount,
      score: s.score,
      rank: rankFor(s),
      seconds: Math.round(s.playMs / 1000),
    },
    weak: weakSeals(g).map(({ name, howTo, n }) => ({ name, howTo, n })),
  };
}

export function dojoRequest(g: GameState, correction?: string): SenseiRequest | null {
  if (!g.training) return null;
  const def = SIGNS[g.training.sign];
  return {
    kind: "dojo",
    lang: getLang(),
    mentor: name(mentorFor(g.characterId)),
    seal: { name: tr(def.name), howTo: tr(def.howTo) },
    correction,
  };
}

/** Offline debrief built from the stats (used when the AI is unavailable). */
export function localReview(g: GameState, outcome: "victory" | "defeat"): string {
  const ru = getLang() === "ru";
  const acc = Math.round(accuracy(g.stats) * 100);
  const w = weakSeals(g)[0];
  const first =
    outcome === "victory"
      ? ru
        ? `Неплохо. Точность ${acc}%, максимальное комбо — ${g.stats.maxCombo}.`
        : `Not bad. ${acc}% accuracy, best combo ${g.stats.maxCombo}.`
      : ru
        ? `Ты проиграл, но точность ${acc}% — это уже фундамент.`
        : `You lost, but ${acc}% accuracy is a foundation to build on.`;
  const second = w
    ? ru
      ? `Больше всего ошибок на печати «${w.name}» (${w.n}): ${w.howTo.charAt(0).toLowerCase() + w.howTo.slice(1)}.`
      : `Your weakest seal was ${w.name} (${w.n} mistakes): ${w.howTo.charAt(0).toLowerCase() + w.howTo.slice(1)}.`
    : ru
      ? "Ни одной ошибки — теперь работай над скоростью, чтобы собирать бонусы за время."
      : "Not a single mistake — now work on speed to earn the time bonus.";
  const third = ru ? "Отдохни, выпей воды — и снова в бой." : "Rest, drink some water, and get back out there.";
  return `${first} ${second} ${third}`;
}
