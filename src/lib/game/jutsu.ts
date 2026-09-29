import type { Jutsu, JutsuEffect, JutsuId } from "@/types/game";
import type { SignId } from "@/types/gestures";
import type { L } from "@/types/i18n";

/**
 * Jutsu with their seal sequences as listed in fan seal guides for the series
 * (Rasengan, Kirin and Rasenshuriken use the game's special seals).
 * Where the series shows a very long sequence, it is marked as abridged.
 *
 * Every jutsu has an EFFECT on top of its damage — that's what makes the
 * choice of three matter: defence (shield), set-up (boost), damage over time
 * (burn, summon), sustain (heal) or a high-risk finisher.
 */
const DAMAGE_BY_LENGTH: Record<number, number> = { 3: 200, 4: 280, 5: 360, 6: 440 };

function make(
  id: JutsuId,
  element: Jutsu["element"],
  name: L,
  romaji: string,
  kanji: string,
  sequence: SignId[],
  color: string,
  glow: string,
  effect: JutsuEffect,
  opts: { damage?: number; note?: L } = {},
): Jutsu {
  const n = sequence.length;
  return {
    id,
    element,
    name,
    romaji,
    kanji,
    sequence,
    damage: opts.damage ?? DAMAGE_BY_LENGTH[n] ?? 160 + n * 45,
    // Tighter than before: ~2.5 s per seal plus a small buffer.
    timeLimitMs: 3000 + n * 2500,
    difficulty: n <= 3 ? 1 : n <= 5 ? 2 : 3,
    color,
    glow,
    effect,
    note: opts.note,
  };
}

const CHAKRA = ["#2ec5ff", "#c9f4ff"] as const;
const FIRE = ["#ff6a1f", "#ffb347"] as const;
const WATER = ["#1fa2ff", "#7fd8ff"] as const;
const LIGHTNING = ["#b28cff", "#e3f1ff"] as const;
const WIND = ["#5dffc1", "#e2fff4"] as const;

export const JUTSU: Record<JutsuId, Jutsu> = {
  HENGE: make("HENGE", "chakra", { ru: "Техника превращения", en: "Transformation" }, "Henge no Jutsu", "変化", ["DOG", "BOAR", "TIGER"], ...CHAKRA, { kind: "shield", hits: 1 }, { damage: 140 }),
  KAWARIMI: make("KAWARIMI", "chakra", { ru: "Техника замены", en: "Body Replacement" }, "Kawarimi no Jutsu", "変わり身", ["TIGER", "BOAR", "OX", "SNAKE"], ...CHAKRA, { kind: "shield", hits: 2 }, { damage: 160 }),
  KAGE_BUNSHIN: make("KAGE_BUNSHIN", "chakra", { ru: "Теневое клонирование", en: "Shadow Clone" }, "Kage Bunshin no Jutsu", "影分身", ["RAM", "SNAKE", "TIGER"], ...CHAKRA, { kind: "boost", mult: 1.8 }, { damage: 150 }),
  GOKAKYU: make("GOKAKYU", "fire", { ru: "Катон: Великий огненный шар", en: "Fire Style: Great Fireball" }, "Katon: Gōkakyū no Jutsu", "豪火球", ["SNAKE", "RAM", "MONKEY", "BOAR", "HORSE", "TIGER"], ...FIRE, { kind: "burn", dmg: 70, turns: 3 }),
  CHIDORI: make("CHIDORI", "lightning", { ru: "Чидори", en: "Chidori" }, "Chidori", "千鳥", ["OX", "RABBIT", "MONKEY"], ...LIGHTNING, { kind: "pierce", perfectMult: 1.9 }),
  RYUKA: make("RYUKA", "fire", { ru: "Катон: Пламя дракона", en: "Fire Style: Dragon Flame" }, "Katon: Ryūka no Jutsu", "龍火", ["SNAKE", "DRAGON", "RABBIT", "TIGER"], ...FIRE, { kind: "burn", dmg: 90, turns: 2 }),
  SUIRYUDAN: make(
    "SUIRYUDAN",
    "water",
    { ru: "Суйтон: Водяной дракон", en: "Water Style: Water Dragon" },
    "Suiton: Suiryūdan no Jutsu",
    "水龍弾",
    ["OX", "MONKEY", "RABBIT", "RAT", "BOAR", "BIRD"],
    ...WATER,
    { kind: "heal", hp: 30 },
    { damage: 340, note: { ru: "сокращено: первые 6 из 44 печатей", en: "abridged: first 6 of 44 seals" } },
  ),
  HOSENKA: make("HOSENKA", "fire", { ru: "Катон: Огонь феникса", en: "Fire Style: Phoenix Flower" }, "Katon: Hōsenka no Jutsu", "鳳仙火", ["RAT", "TIGER", "DOG", "OX", "RABBIT", "TIGER"], ...FIRE, { kind: "combo", perCombo: 22 }, { damage: 340 }),
  KUCHIYOSE: make("KUCHIYOSE", "chakra", { ru: "Техника призыва", en: "Summoning" }, "Kuchiyose no Jutsu", "口寄せ", ["BOAR", "DOG", "BIRD", "MONKEY", "RAM"], "#c77dff", "#f1d9ff", { kind: "summon", dmg: 90, turns: 3, hits: 1 }, { damage: 200 }),
  RASENGAN: make("RASENGAN", "chakra", { ru: "Расенган", en: "Rasengan" }, "Rasengan", "螺旋丸", ["CONFRONT", "SPIRIT", "FOX"], "#3aa0ff", "#dff3ff", { kind: "none" }, { damage: 330 }),
  KIRIN: make("KIRIN", "lightning", { ru: "Кирин", en: "Kirin" }, "Kirin", "麒麟", ["DRAGON", "WIND", "SPIRIT", "OX", "TIGER"], ...LIGHTNING, { kind: "execute", belowPct: 0.4, mult: 2.2 }, { damage: 300 }),
  RASENSHURIKEN: make("RASENSHURIKEN", "wind", { ru: "Футон: Расен-сюрикен", en: "Wind Style: Rasenshuriken" }, "Fūton: Rasenshuriken", "螺旋手裏剣", ["WIND", "FOX", "SPIRIT", "CONFRONT", "WIND"], ...WIND, { kind: "recoil", hp: 15 }, { damage: 620 }),
};

export const JUTSU_LIST: Jutsu[] = Object.values(JUTSU);

/** Order in which jutsu are learned in the story. */
export const JUTSU_ORDER: JutsuId[] = ["HENGE", "KAWARIMI", "KAGE_BUNSHIN", "GOKAKYU", "CHIDORI", "RYUKA", "SUIRYUDAN", "RASENGAN", "HOSENKA", "KUCHIYOSE", "KIRIN", "RASENSHURIKEN"];

export const LOADOUT_SIZE = 3;

export const BOSS = { maxHp: 1000 };

/** When a jutsu's animation lands (ms after JUTSU_CAST) — melee techniques need a dash first. */
export const IMPACT_MS: Partial<Record<JutsuId, number>> = { RASENGAN: 820, CHIDORI: 800, KIRIN: 900, KUCHIYOSE: 1150, KAWARIMI: 900, KAGE_BUNSHIN: 950, SUIRYUDAN: 900, HOSENKA: 800, RASENSHURIKEN: 850, HENGE: 850 };
export const impactMs = (id: JutsuId) => IMPACT_MS[id] ?? 650;

