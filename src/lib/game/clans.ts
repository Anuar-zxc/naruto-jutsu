/**
 * Clans and their talent trees. You join one clan; it gives a passive bonus,
 * and talent points (one per shinobi level) unlock nodes of that clan's tree.
 *
 * Every tree has four tiers: two nodes in each of the first three, and a
 * capstone. A node needs at least one node of the tier above it.
 */
import type { L } from "@/types/i18n";
import type { BonusPart } from "./bonuses";
import type { CharacterId } from "./characters";

export type ClanId = "uzumaki" | "uchiha" | "hyuga" | "senju" | "nara" | "hatake";

export interface Talent {
  id: string;
  tier: 1 | 2 | 3 | 4;
  kanji: string;
  name: L;
  bonus: BonusPart;
}

export interface Clan {
  id: ClanId;
  kanji: string;
  name: L;
  motto: L;
  color: string;
  /** Artwork shown on the clan card. */
  face: CharacterId;
  passive: BonusPart;
  talents: Talent[];
}

/** Talent point cost per tier. */
export const TIER_COST: Record<Talent["tier"], number> = { 1: 1, 2: 1, 3: 2, 4: 3 };
/** Changing clan costs this much ryō (talents are refunded). */
export const CLAN_SWITCH_COST = 500;

const T = (id: string, tier: Talent["tier"], kanji: string, ru: string, en: string, bonus: BonusPart): Talent => ({ id, tier, kanji, name: { ru, en }, bonus });

export const CLANS: Record<ClanId, Clan> = {
  uzumaki: {
    id: "uzumaki",
    kanji: "渦",
    name: { ru: "Узумаки", en: "Uzumaki" },
    motto: { ru: "Печати, долголетие и бездонный запас чакры.", en: "Seals, longevity and a bottomless chakra reserve." },
    color: "#e63946",
    face: "kushina",
    passive: { hp: 0.15 },
    talents: [
      T("uz1a", 1, "命", "Печать жизни", "Life Seal", { hp: 0.1 }),
      T("uz1b", 1, "鎖", "Цепи чакры", "Chakra Chains", { shields: 1 }),
      T("uz2a", 2, "封", "Фуиндзюцу", "Fūinjutsu", { mistake: 0.15 }),
      T("uz2b", 2, "寿", "Долголетие", "Longevity", { healCast: 0.04 }),
      T("uz3a", 3, "金", "Алмазные цепи", "Adamantine Chains", { taken: 0.12 }),
      T("uz3b", 3, "螺", "Кровь Узумаки", "Uzumaki Blood", { el: { chakra: 0.15, wind: 0.1 } }),
      T("uz4", 4, "無", "Бесконечная чакра", "Endless Chakra", { hp: 0.25, sageStart: 40 }),
    ],
  },
  uchiha: {
    id: "uchiha",
    kanji: "写",
    name: { ru: "Учиха", en: "Uchiha" },
    motto: { ru: "Огонь, шаринган и техники, которые не прощают ошибок.", en: "Fire, the Sharingan and jutsu that forgive no mistakes." },
    color: "#b3001e",
    face: "itachi",
    passive: { el: { fire: 0.1 } },
    talents: [
      T("uc1a", 1, "火", "Катон", "Katon", { el: { fire: 0.1 } }),
      T("uc1b", 1, "眼", "Глаз-копировщик", "Copy Eye", { timeMs: 1000 }),
      T("uc2a", 2, "天", "Аматэрасу", "Amaterasu", { burn: 0.4 }),
      T("uc2b", 2, "月", "Цукуёми", "Tsukuyomi", { perfect: 0.15, flags: ["noGenjutsu"] }),
      T("uc3a", 3, "須", "Сусаноо", "Susanoo", { shields: 2 }),
      T("uc3b", 3, "憎", "Воля Учиха", "Uchiha Will", { execute: 0.3 }),
      T("uc4", 4, "万", "Мангекё пробуждён", "Mangekyō Awakened", { dmg: 0.15, sageSeal: 3 }),
    ],
  },
  hyuga: {
    id: "hyuga",
    kanji: "白",
    name: { ru: "Хьюга", en: "Hyūga" },
    motto: { ru: "Бьякуган видит всё: точность и защита.", en: "The Byakugan sees everything: precision and defence." },
    color: "#b8a9e0",
    face: "hinata",
    passive: { mistake: 0.15 },
    talents: [
      T("hy1a", 1, "眼", "Бьякуган", "Byakugan", { perfect: 0.15 }),
      T("hy1b", 1, "柔", "Мягкий кулак", "Gentle Fist", { dmg: 0.08 }),
      T("hy2a", 2, "回", "Хаккешо Кайтен", "Rotation", { shields: 1 }),
      T("hy2b", 2, "掌", "64 ладони", "64 Palms", { el: { chakra: 0.2 } }),
      T("hy3a", 3, "点", "Точки тенкецу", "Tenketsu Points", { execute: 0.25 }),
      T("hy3b", 3, "守", "Абсолютная защита", "Absolute Defence", { taken: 0.12 }),
      T("hy4", 4, "宗", "Сила главной ветви", "Main Branch Power", { perfect: 0.3, flags: ["noGenjutsu", "noFog"] }),
    ],
  },
  senju: {
    id: "senju",
    kanji: "千",
    name: { ru: "Сенджу", en: "Senju" },
    motto: { ru: "Живучесть, исцеление и сила Бога шиноби.", en: "Vitality, healing and the strength of the God of Shinobi." },
    color: "#2e9e5b",
    face: "hashirama",
    passive: { healCast: 0.03 },
    talents: [
      T("se1a", 1, "体", "Крепкое тело", "Sturdy Body", { hp: 0.1 }),
      T("se1b", 1, "樹", "Древесный щит", "Wood Shield", { shields: 1 }),
      T("se2a", 2, "吸", "Поглощение чакры", "Chakra Drain", { lifesteal: 0.06 }),
      T("se2b", 2, "壁", "Стена из дерева", "Wood Wall", { taken: 0.1 }),
      T("se3a", 3, "木", "Мокутон", "Mokuton", { dmg: 0.12 }),
      T("se3b", 3, "細", "Клетки Хаширамы", "Hashirama Cells", { healCast: 0.05 }),
      T("se4", 4, "神", "Бог шиноби", "God of Shinobi", { hp: 0.2, dmg: 0.1, lifesteal: 0.05 }),
    ],
  },
  nara: {
    id: "nara",
    kanji: "影",
    name: { ru: "Нара", en: "Nara" },
    motto: { ru: "Тени, стратегия и время на твоей стороне.", en: "Shadows, strategy and time on your side." },
    color: "#6b8e23",
    face: "shikamaru",
    passive: { timeMs: 1500 },
    talents: [
      T("na1a", 1, "縛", "Теневое удержание", "Shadow Bind", { timeMs: 1000 }),
      T("na1b", 1, "策", "Холодный расчёт", "Cold Calculation", { mistake: 0.1 }),
      T("na2a", 2, "首", "Теневая удавка", "Shadow Strangle", { taken: 0.1 }),
      T("na2b", 2, "知", "IQ 200", "IQ 200", { sageSeal: 2 }),
      T("na3a", 3, "針", "Теневые иглы", "Shadow Needles", { timeMs: 1500, perfect: 0.1 }),
      T("na3b", 3, "鹿", "Олени Нара", "Nara Deer", { ryo: 0.15, xp: 0.1 }),
      T("na4", 4, "将", "Мастер стратегии", "Master Strategist", { timeMs: 2000, sageStart: 50 }),
    ],
  },
  hatake: {
    id: "hatake",
    kanji: "雷",
    name: { ru: "Хатаке", en: "Hatake" },
    motto: { ru: "Белый Клык, молния и тысяча скопированных техник.", en: "The White Fang, lightning and a thousand copied jutsu." },
    color: "#8fb3c9",
    face: "kakashi",
    passive: { el: { lightning: 0.1 } },
    talents: [
      T("ha1a", 1, "雷", "Райтон", "Raiton", { el: { lightning: 0.1 } }),
      T("ha1b", 1, "風", "Лезвие ветра", "Wind Blade", { el: { wind: 0.1 } }),
      T("ha2a", 2, "切", "Райкири", "Raikiri", { perfect: 0.2 }),
      T("ha2b", 2, "牙", "Белый Клык", "White Fang", { dmg: 0.08 }),
      T("ha3a", 3, "犬", "Нинкены", "Ninken", { shields: 1 }),
      T("ha3b", 3, "千", "Тысяча техник", "A Thousand Jutsu", { xp: 0.1, ryo: 0.1 }),
      T("ha4", 4, "神", "Камуи", "Kamui", { execute: 0.4, el: { lightning: 0.15 } }),
    ],
  },
};

export const CLAN_LIST = Object.values(CLANS);

export const isClanId = (x: unknown): x is ClanId => typeof x === "string" && x in CLANS;

/** Talent points spent on a set of talents. */
export function spentPoints(clan: ClanId | null, talents: string[]): number {
  if (!clan) return 0;
  return CLANS[clan].talents.filter((t) => talents.includes(t.id)).reduce((a, t) => a + TIER_COST[t.tier], 0);
}

/** Can this talent be learned right now? */
export function canLearn(clan: ClanId | null, talents: string[], id: string, points: number): boolean {
  if (!clan) return false;
  const t = CLANS[clan].talents.find((x) => x.id === id);
  if (!t || talents.includes(id)) return false;
  if (points - spentPoints(clan, talents) < TIER_COST[t.tier]) return false;
  if (t.tier === 1) return true;
  return CLANS[clan].talents.some((x) => x.tier === t.tier - 1 && talents.includes(x.id));
}

/** Only keep talents that belong to the clan (and whose prerequisites hold). */
export function cleanTalents(clan: ClanId | null, talents: string[]): string[] {
  if (!clan) return [];
  const own = CLANS[clan].talents;
  const out: string[] = [];
  for (const tier of [1, 2, 3, 4] as const) {
    const ok = tier === 1 || own.some((x) => x.tier === tier - 1 && out.includes(x.id));
    if (!ok) break;
    for (const x of own) if (x.tier === tier && talents.includes(x.id)) out.push(x.id);
  }
  return out;
}

/** The bonus parts contributed by a clan: its passive + the learned talents. */
export function clanBonuses(clan: ClanId | null, talents: string[]): BonusPart[] {
  if (!clan) return [];
  const c = CLANS[clan];
  return [c.passive, ...c.talents.filter((t) => talents.includes(t.id)).map((t) => t.bonus)];
}
