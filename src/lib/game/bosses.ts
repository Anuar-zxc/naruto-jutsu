/**
 * Bosses with mechanics — a few villains fight by their own rules:
 *
 *   Itachi    Tsukuyomi     every 3rd round the seals must be made in REVERSE order
 *   Kakuzu    Five hearts   the same element twice in a row is resisted, a new one hits harder
 *   Kaguya    Dimensions    below half chakra she tears the arena into another dimension (timers −15%)
 *   Pain      Shinra Tensei every 3rd round only a perfect jutsu breaks through
 *   Madara    Limbo         shields don't stop him, and he hits harder
 *   Orochimaru Shedding     regenerates a little chakra every round
 *
 * Mechanics apply in story, quick battle, survival and the daily challenge.
 */
import type { GameMode } from "@/types/game";
import type { L } from "@/types/i18n";
import type { CharacterId } from "./characters";

export type MechId = "tsukuyomi" | "hearts" | "dimension" | "shinra" | "limbo" | "shedding";

export interface Mechanic {
  id: MechId;
  kanji: string;
  name: L;
  desc: L;
}

export const MECHANICS: Record<MechId, Mechanic> = {
  tsukuyomi: { id: "tsukuyomi", kanji: "月読", name: { ru: "Цукуёми", en: "Tsukuyomi" }, desc: { ru: "Каждый 3-й раунд — гендзюцу: печати в обратном порядке", en: "Every 3rd round — genjutsu: seals in reverse order" } },
  hearts: { id: "hearts", kanji: "五心", name: { ru: "Пять сердец", en: "Five Hearts" }, desc: { ru: "Одна стихия подряд — урон ×0.5, новая стихия — ×1.25", en: "Same element twice — ×0.5 damage, a new element — ×1.25" } },
  dimension: { id: "dimension", kanji: "次元", name: { ru: "Смена измерений", en: "Dimension Shift" }, desc: { ru: "Ниже половины чакры меняет арену, таймеры −15%", en: "Below half chakra she shifts the arena, timers −15%" } },
  shinra: { id: "shinra", kanji: "神羅", name: { ru: "Шинра Тенсей", en: "Shinra Tensei" }, desc: { ru: "Каждый 3-й раунд отталкивает всё, кроме идеальной техники", en: "Every 3rd round repels anything but a perfect jutsu" } },
  limbo: { id: "limbo", kanji: "輪墓", name: { ru: "Лимбо", en: "Limbo" }, desc: { ru: "Щиты не спасают, удары сильнее на 15%", en: "Shields don't help, strikes 15% harder" } },
  shedding: { id: "shedding", kanji: "脱皮", name: { ru: "Сброс кожи", en: "Skin Shedding" }, desc: { ru: "Восстанавливает 40 чакры каждый раунд", en: "Regenerates 40 chakra every round" } },
};

const BY_BOSS: Partial<Record<CharacterId, MechId>> = {
  itachi: "tsukuyomi",
  kakuzu: "hearts",
  kaguya: "dimension",
  pain: "shinra",
  nagato: "shinra",
  madara: "limbo",
  orochimaru: "shedding",
};

const MECH_MODES: GameMode[] = ["story", "quick", "survival", "daily"];

/** The mechanic the current enemy fights with, if any. */
export function mechFor(mode: GameMode, bossId: CharacterId | null): MechId | null {
  if (!bossId || !MECH_MODES.includes(mode)) return null;
  return BY_BOSS[bossId] ?? null;
}

export const SHINRA_EVERY = 3;
export const TSUKUYOMI_EVERY = 3;
export const SHINRA_MULT = 0.35;
export const HEART_SAME = 0.5;
export const HEART_NEW = 1.25;
export const LIMBO_MULT = 1.15;
export const SHED_HP = 40;
export const DIMENSION_TIME = 0.85;

/** Genjutsu round (Itachi): the 2nd, 5th, 8th… round — never the opener. */
export const isGenjutsuRound = (round: number) => round % TSUKUYOMI_EVERY === 2;
/** Shinra Tensei round (Pain/Nagato): the 3rd, 6th, 9th… round. */
export const isShinraRound = (round: number) => round % SHINRA_EVERY === 0;
