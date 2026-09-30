/**
 * Shinobi Path — the season pass. Every fight earns XP; every level pays a
 * reward (ryō, a title under your nickname or a frame for the battle card)
 * and one talent point for the clan tree.
 */
import type { L } from "@/types/i18n";
import type { GameMode, Rank } from "@/types/game";

export const SEASON: L = { ru: "Сезон 1 · Воля Огня", en: "Season 1 · Will of Fire" };
export const XP_PER_LEVEL = 300;
export const MAX_LEVEL = 30;

export type FrameId = "scroll" | "akatsuki" | "sharingan" | "uzumaki" | "lightning" | "flame" | "rinnegan" | "gold";

export interface Frame {
  id: FrameId;
  name: L;
  /** Two colours for the card border gradient. */
  colors: [string, string];
  kanji: string;
}

export const FRAMES: Record<FrameId, Frame> = {
  scroll: { id: "scroll", name: { ru: "Свиток", en: "Scroll" }, colors: ["#e8d3a3", "#8a6a3a"], kanji: "巻" },
  akatsuki: { id: "akatsuki", name: { ru: "Облака Акацуки", en: "Akatsuki Clouds" }, colors: ["#e63946", "#1a0b10"], kanji: "暁" },
  sharingan: { id: "sharingan", name: { ru: "Шаринган", en: "Sharingan" }, colors: ["#ff1f3d", "#2a0006"], kanji: "写" },
  uzumaki: { id: "uzumaki", name: { ru: "Водоворот", en: "Whirlpool" }, colors: ["#ff8a1f", "#e63946"], kanji: "渦" },
  lightning: { id: "lightning", name: { ru: "Молния", en: "Lightning" }, colors: ["#b28cff", "#2ec5ff"], kanji: "雷" },
  flame: { id: "flame", name: { ru: "Пламя", en: "Flame" }, colors: ["#ffd166", "#ff4d1f"], kanji: "炎" },
  rinnegan: { id: "rinnegan", name: { ru: "Риннеган", en: "Rinnegan" }, colors: ["#d0b8ff", "#5b2a9e"], kanji: "輪" },
  gold: { id: "gold", name: { ru: "Золото Каге", en: "Kage Gold" }, colors: ["#fff2a8", "#c28a00"], kanji: "影" },
};

export type TitleId = "genin" | "chunin" | "tokubetsu" | "jonin" | "anbu" | "sannin" | "kage" | "sixpaths";

export const TITLES: Record<TitleId, L> = {
  genin: { ru: "Генин", en: "Genin" },
  chunin: { ru: "Чунин", en: "Chūnin" },
  tokubetsu: { ru: "Токубецу-джонин", en: "Tokubetsu Jōnin" },
  jonin: { ru: "Джонин", en: "Jōnin" },
  anbu: { ru: "АНБУ", en: "ANBU" },
  sannin: { ru: "Легендарный саннин", en: "Legendary Sannin" },
  kage: { ru: "Каге", en: "Kage" },
  sixpaths: { ru: "Мудрец Шести Путей", en: "Sage of Six Paths" },
};

export type PassReward = { kind: "ryo"; n: number } | { kind: "title"; id: TitleId } | { kind: "frame"; id: FrameId };

const SPECIAL: Record<number, PassReward> = {
  2: { kind: "title", id: "genin" },
  3: { kind: "frame", id: "scroll" },
  5: { kind: "title", id: "chunin" },
  7: { kind: "frame", id: "akatsuki" },
  8: { kind: "title", id: "tokubetsu" },
  10: { kind: "frame", id: "sharingan" },
  12: { kind: "title", id: "jonin" },
  14: { kind: "frame", id: "uzumaki" },
  15: { kind: "title", id: "anbu" },
  18: { kind: "frame", id: "lightning" },
  20: { kind: "title", id: "sannin" },
  22: { kind: "frame", id: "flame" },
  25: { kind: "title", id: "kage" },
  28: { kind: "frame", id: "rinnegan" },
  30: { kind: "title", id: "sixpaths" },
};

/** Reward for reaching a level (level 1 is where everyone starts). */
export function rewardFor(level: number): PassReward {
  if (level === MAX_LEVEL - 1) return { kind: "frame", id: "gold" };
  return SPECIAL[level] ?? { kind: "ryo", n: 150 + level * 25 };
}

export const levelFor = (xp: number) => Math.min(MAX_LEVEL, 1 + Math.floor(Math.max(0, xp) / XP_PER_LEVEL));
/** XP inside the current level and the size of the level. */
export function levelProgress(xp: number): { level: number; into: number; need: number } {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, into: XP_PER_LEVEL, need: XP_PER_LEVEL };
  return { level, into: xp - (level - 1) * XP_PER_LEVEL, need: XP_PER_LEVEL };
}

/** XP for a finished fight. */
export function xpFor(o: { win: boolean; rank: Rank; mode: GameMode; waves?: number }): number {
  if (o.mode === "training" || o.mode === "lab") return 0;
  if (o.mode === "survival") return 40 + (o.waves ?? 0) * 45;
  if (o.mode === "party") return 70;
  if (!o.win) return 40;
  const byRank: Record<Rank, number> = { S: 90, A: 60, B: 35, C: 15 };
  return 120 + byRank[o.rank] + (o.mode === "daily" ? 150 : 0) + (o.mode === "duel" ? 80 : 0);
}

/** Titles and frames unlocked at a given level. */
export function unlockedCosmetics(level: number): { titles: TitleId[]; frames: FrameId[] } {
  const titles: TitleId[] = [];
  const frames: FrameId[] = [];
  for (let l = 2; l <= level; l++) {
    const r = rewardFor(l);
    if (r.kind === "title") titles.push(r.id);
    if (r.kind === "frame") frames.push(r.id);
  }
  return { titles, frames };
}

export const isTitleId = (x: unknown): x is TitleId => typeof x === "string" && x in TITLES;
export const isFrameId = (x: unknown): x is FrameId => typeof x === "string" && x in FRAMES;
