/**
 * Shout the jutsu's name: browser speech recognition (Chrome / Edge) listens
 * while you fight; saying the technique's name (Russian or Japanese romaji)
 * powers up the cast. Everything degrades silently where the API is missing.
 */
import type { JutsuId } from "@/types/game";

type Rec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

/** Words that count as the jutsu's name (lower-case stems, ru + romaji). */
export const SHOUT_WORDS: Record<JutsuId, string[]> = {
  HENGE: ["хенге", "henge", "превращ"],
  KAWARIMI: ["каварими", "kawarimi", "замен"],
  KAGE_BUNSHIN: ["бунсин", "буншин", "bunshin", "клон", "каге"],
  GOKAKYU: ["гокакю", "gokakyu", "катон", "katon", "огненн", "шар"],
  CHIDORI: ["чидори", "chidori"],
  RYUKA: ["рюка", "ryuka", "дракон", "пламя"],
  SUIRYUDAN: ["суйрюдан", "suiryudan", "суйтон", "suiton", "водян"],
  HOSENKA: ["хосенка", "hosenka", "феникс"],
  KUCHIYOSE: ["кучиёсе", "кучиесе", "кучиесэ", "kuchiyose", "призыв"],
  RASENGAN: ["расенган", "расэнган", "rasengan"],
  KIRIN: ["кирин", "kirin"],
  RASENSHURIKEN: ["сюрикен", "шурикен", "shuriken", "расен"],
};

export function matchShout(text: string, jutsu: JutsuId): string | null {
  const low = text.toLowerCase();
  return SHOUT_WORDS[jutsu].find((w) => low.includes(w)) ?? null;
}

export const voiceSupported = () =>
  typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

export class VoiceListener {
  private rec: Rec | null = null;
  private wanted = false;

  start(lang: string, onText: (text: string) => void) {
    if (!voiceSupported() || this.wanted) return;
    const W = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition!;
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true; // react to the word as soon as it's heard
    rec.maxAlternatives = 3;
    rec.onresult = (e) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        for (let k = 0; k < r.length; k++) onText(r[k].transcript);
      }
    };
    // Chrome ends recognition after silence — keep it alive while wanted.
    rec.onend = () => {
      if (this.wanted) {
        try {
          rec.start();
        } catch {
          /* already started */
        }
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") this.wanted = false;
    };
    this.rec = rec;
    this.wanted = true;
    try {
      rec.start();
    } catch {
      /* ignore */
    }
  }

  stop() {
    this.wanted = false;
    try {
      this.rec?.abort();
    } catch {
      /* ignore */
    }
    this.rec = null;
  }
}
