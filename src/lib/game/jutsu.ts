import type { Jutsu, JutsuId } from "@/types/game";

/**
 * Jutsu catalogue. Sequences never repeat the same seal twice in a row, so the
 * player always has to visibly change pose between steps.
 */
export const JUTSU: Record<JutsuId, Jutsu> = {
  FIRE: {
    id: "FIRE",
    element: "fire",
    style: "Fire Style",
    name: "Ember Tiger Blast",
    kanji: "火遁",
    sequence: ["TIGER", "RAM", "SNAKE", "HORSE"],
    damage: 300,
    timeLimitMs: 16000,
    difficulty: 1,
    color: "#ff6a1f",
    glow: "#ffb347",
  },
  WATER: {
    id: "WATER",
    element: "water",
    style: "Water Style",
    name: "Tidal Serpent",
    kanji: "水遁",
    sequence: ["OX", "MONKEY", "DRAGON", "BIRD"],
    damage: 350,
    timeLimitMs: 18000,
    difficulty: 2,
    color: "#1fa2ff",
    glow: "#7fd8ff",
  },
  LIGHTNING: {
    id: "LIGHTNING",
    element: "lightning",
    style: "Lightning Style",
    name: "Thunder Fang",
    kanji: "雷遁",
    sequence: ["RAM", "DRAGON", "TIGER", "SNAKE", "BIRD"],
    damage: 450,
    timeLimitMs: 20000,
    difficulty: 3,
    color: "#b28cff",
    glow: "#e3f1ff",
  },
};

export const JUTSU_LIST: Jutsu[] = Object.values(JUTSU);

export const BOSS = {
  maxHp: 1000,
};
