/**
 * Player profile: nickname, ryō (money) and permanent upgrades bought in the shop.
 * Pure data + rules here; persistence lives in GameSession (localStorage).
 */
import type { L } from "@/types/i18n";
import type { GameMode, Rank } from "@/types/game";

export type UpgradeId = "chakra" | "power" | "speed" | "focus" | "guard";

export interface UpgradeDef {
  id: UpgradeId;
  kanji: string;
  name: L;
  /** What one level gives. */
  per: L;
  max: number;
  /** Price of level 1, 2, 3… */
  cost: number[];
}

export const UPGRADES: UpgradeDef[] = [
  { id: "chakra", kanji: "気", name: { ru: "Запас чакры", en: "Chakra Reserve" }, per: { ru: "+10% максимальной чакры", en: "+10% max chakra" }, max: 5, cost: [150, 300, 500, 800, 1200] },
  { id: "power", kanji: "力", name: { ru: "Сила техник", en: "Jutsu Power" }, per: { ru: "+8% урона всех техник", en: "+8% damage for every jutsu" }, max: 5, cost: [200, 400, 650, 1000, 1500] },
  { id: "speed", kanji: "速", name: { ru: "Быстрые руки", en: "Quick Hands" }, per: { ru: "+1 с на каждую технику", en: "+1 s on every jutsu" }, max: 3, cost: [250, 550, 900] },
  { id: "focus", kanji: "心", name: { ru: "Концентрация", en: "Focus" }, per: { ru: "−15% цены ошибки", en: "−15% mistake cost" }, max: 3, cost: [200, 450, 800] },
  { id: "guard", kanji: "護", name: { ru: "Щит предков", en: "Ancestral Guard" }, per: { ru: "+1 щит в начале каждого боя", en: "+1 shield at the start of every fight" }, max: 2, cost: [600, 1400] },
];

export type Upgrades = Record<UpgradeId, number>;
export const noUpgrades = (): Upgrades => ({ chakra: 0, power: 0, speed: 0, focus: 0, guard: 0 });

export interface Profile {
  nick: string;
  ryo: number;
  upgrades: Upgrades;
  /** Lifetime stats (shown in the profile card). */
  wins: number;
  duelsWon: number;
}

export const defaultProfile = (): Profile => ({ nick: "", ryo: 0, upgrades: noUpgrades(), wins: 0, duelsWon: 0 });

export const MAX_NICK = 16;

/** Clean a nickname: trim, collapse spaces, drop control/markup characters, cap length. */
export function cleanNick(raw: string): string {
  return raw
    .replace(/[\u0000-\u001f<>{}]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NICK);
}

export function randomNick(rnd = Math.random): string {
  const a = ["Swift", "Silent", "Crimson", "Shadow", "Storm", "Leaf", "Sand", "Mist", "Iron", "Ember"];
  const b = ["Fox", "Hawk", "Viper", "Tiger", "Crow", "Wolf", "Toad", "Dragon", "Owl", "Shark"];
  return `${a[Math.floor(rnd() * a.length)]}${b[Math.floor(rnd() * b.length)]}${Math.floor(rnd() * 90 + 10)}`;
}

/** Validate/normalise anything read from storage or the network. */
export function sanitizeProfile(raw: unknown): Profile {
  const p = defaultProfile();
  if (!raw || typeof raw !== "object") return p;
  const r = raw as Record<string, unknown>;
  p.nick = typeof r.nick === "string" ? cleanNick(r.nick) : "";
  p.ryo = typeof r.ryo === "number" && Number.isFinite(r.ryo) ? Math.max(0, Math.floor(r.ryo)) : 0;
  p.wins = typeof r.wins === "number" ? Math.max(0, Math.floor(r.wins)) : 0;
  p.duelsWon = typeof r.duelsWon === "number" ? Math.max(0, Math.floor(r.duelsWon)) : 0;
  const u = (r.upgrades ?? {}) as Record<string, unknown>;
  for (const def of UPGRADES) {
    const v = u[def.id];
    p.upgrades[def.id] = typeof v === "number" ? Math.max(0, Math.min(def.max, Math.floor(v))) : 0;
  }
  return p;
}

export function nextCost(p: Profile, id: UpgradeId): number | null {
  const def = UPGRADES.find((d) => d.id === id)!;
  const lvl = p.upgrades[id];
  return lvl >= def.max ? null : def.cost[lvl];
}

/** Buy one level. Returns the new profile, or null if maxed / not enough ryō. */
export function buy(p: Profile, id: UpgradeId): Profile | null {
  const cost = nextCost(p, id);
  if (cost == null || p.ryo < cost) return null;
  return { ...p, ryo: p.ryo - cost, upgrades: { ...p.upgrades, [id]: p.upgrades[id] + 1 } };
}

/** Ryō earned for a finished fight. */
export function reward(o: { win: boolean; rank: Rank; mode: GameMode; chapter: number | null; perfect: number }): number {
  if (!o.win) return 25;
  const byRank: Record<Rank, number> = { S: 300, A: 200, B: 130, C: 80 };
  const chapterBonus = o.mode === "story" && o.chapter != null ? o.chapter * 20 : 0;
  const duel = o.mode === "duel" ? 150 : 0;
  return byRank[o.rank] + chapterBonus + duel + o.perfect * 15;
}

/** Ryō for mastering a new seal in the dojo. */
export const DOJO_REWARD = 40;

// --- How upgrades change combat (used by the reducer) -------------------------
export const hpMult = (u: Upgrades) => 1 + 0.1 * u.chakra;
export const powerMult = (u: Upgrades) => 1 + 0.08 * u.power;
export const speedBonusMs = (u: Upgrades) => 1000 * u.speed;
export const focusMult = (u: Upgrades) => 1 - 0.15 * u.focus;
export const startShields = (u: Upgrades) => u.guard;
