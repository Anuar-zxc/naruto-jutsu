import type { Jutsu, JutsuId } from "@/types/game";
import type { SignId } from "@/types/gestures";
import type { L } from "@/types/i18n";

/**
 * Jutsu with their seal sequences as listed in fan seal guides for the series.
 * Where the series shows a very long sequence, it is marked as abridged.
 * Damage and time scale with the number of seals.
 */
const DAMAGE_BY_LENGTH: Record<number, number> = { 3: 220, 4: 300, 5: 380, 6: 460 };

function make(
  id: JutsuId,
  element: Jutsu["element"],
  name: L,
  romaji: string,
  kanji: string,
  sequence: SignId[],
  color: string,
  glow: string,
  note?: L,
): Jutsu {
  const n = sequence.length;
  return {
    id,
    element,
    name,
    romaji,
    kanji,
    sequence,
    damage: DAMAGE_BY_LENGTH[n] ?? 200 + n * 45,
    timeLimitMs: 4000 + n * 3000,
    difficulty: n <= 3 ? 1 : n <= 5 ? 2 : 3,
    color,
    glow,
    note,
  };
}

const CHAKRA = ["#2ec5ff", "#c9f4ff"] as const;
const FIRE = ["#ff6a1f", "#ffb347"] as const;
const WATER = ["#1fa2ff", "#7fd8ff"] as const;
const LIGHTNING = ["#b28cff", "#e3f1ff"] as const;

export const JUTSU: Record<JutsuId, Jutsu> = {
  HENGE: make("HENGE", "chakra", { ru: "Техника превращения", en: "Transformation" }, "Henge no Jutsu", "変化", ["DOG", "BOAR", "TIGER"], ...CHAKRA),
  KAWARIMI: make("KAWARIMI", "chakra", { ru: "Техника замены", en: "Body Replacement" }, "Kawarimi no Jutsu", "変わり身", ["TIGER", "BOAR", "OX", "SNAKE"], ...CHAKRA),
  KAGE_BUNSHIN: make("KAGE_BUNSHIN", "chakra", { ru: "Теневое клонирование", en: "Shadow Clone" }, "Kage Bunshin no Jutsu", "影分身", ["RAM", "SNAKE", "TIGER"], ...CHAKRA),
  GOKAKYU: make("GOKAKYU", "fire", { ru: "Катон: Великий огненный шар", en: "Fire Style: Great Fireball" }, "Katon: Gōkakyū no Jutsu", "豪火球", ["SNAKE", "RAM", "MONKEY", "BOAR", "HORSE", "TIGER"], ...FIRE),
  CHIDORI: make("CHIDORI", "lightning", { ru: "Чидори", en: "Chidori" }, "Chidori", "千鳥", ["OX", "RABBIT", "MONKEY"], ...LIGHTNING),
  RYUKA: make("RYUKA", "fire", { ru: "Катон: Пламя дракона", en: "Fire Style: Dragon Flame" }, "Katon: Ryūka no Jutsu", "龍火", ["SNAKE", "DRAGON", "RABBIT", "TIGER"], ...FIRE),
  SUIRYUDAN: make(
    "SUIRYUDAN",
    "water",
    { ru: "Суйтон: Водяной дракон", en: "Water Style: Water Dragon" },
    "Suiton: Suiryūdan no Jutsu",
    "水龍弾",
    ["OX", "MONKEY", "RABBIT", "RAT", "BOAR", "BIRD"],
    ...WATER,
    { ru: "сокращено: первые 6 из 44 печатей", en: "abridged: first 6 of 44 seals" },
  ),
  HOSENKA: make("HOSENKA", "fire", { ru: "Катон: Огонь феникса", en: "Fire Style: Phoenix Flower" }, "Katon: Hōsenka no Jutsu", "鳳仙火", ["RAT", "TIGER", "DOG", "OX", "RABBIT", "TIGER"], ...FIRE),
  KUCHIYOSE: make("KUCHIYOSE", "chakra", { ru: "Техника призыва", en: "Summoning" }, "Kuchiyose no Jutsu", "口寄せ", ["BOAR", "DOG", "BIRD", "MONKEY", "RAM"], "#c77dff", "#f1d9ff"),
};

export const JUTSU_LIST: Jutsu[] = Object.values(JUTSU);

/** Order in which jutsu are learned in the story. */
export const JUTSU_ORDER: JutsuId[] = ["HENGE", "KAWARIMI", "KAGE_BUNSHIN", "GOKAKYU", "CHIDORI", "RYUKA", "SUIRYUDAN", "HOSENKA", "KUCHIYOSE"];

export const BOSS = { maxHp: 1000 };
