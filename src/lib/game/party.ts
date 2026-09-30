/**
 * Party mode — two players, one camera, taking turns ("hot seat").
 *
 *   versus  the players fight each other; each turn one of them casts at the other
 *   coop    together against a boss; two different jutsu in a row from the two
 *           players fuse into a TEAM TECHNIQUE (Rasengan + Chidori, fire + wind…)
 */
import type { Element, JutsuId } from "@/types/game";
import type { L } from "@/types/i18n";
import { JUTSU } from "./jutsu";

export type PartyVariant = "versus" | "coop";

export const PARTY_HP = 1000;
/** Co-op: the team shares one chakra pool, the boss is tougher. */
export const COOP_TEAM_HP = 1500;
export const COOP_BOSS_HP = 2200;
/** Longer countdown between turns so the players can swap in front of the camera. */
export const PARTY_COUNTDOWN = 5;

export interface TeamCombo {
  id: string;
  kanji: string;
  name: L;
  mult: number;
}

const byPair: Record<string, TeamCombo> = {};
const pairKey = (a: string, b: string) => [a, b].sort().join("+");
function def(a: string, b: string, c: TeamCombo) {
  byPair[pairKey(a, b)] = c;
}

// Named pairs of specific jutsu first…
def("RASENGAN", "CHIDORI", { id: "rasengan-chidori", kanji: "螺旋千鳥", name: { ru: "Расенган × Чидори", en: "Rasengan × Chidori" }, mult: 2.2 });
def("RASENSHURIKEN", "GOKAKYU", { id: "scorch-storm", kanji: "灼遁", name: { ru: "Шторм Расен-пламени", en: "Scorch Release Storm" }, mult: 2.1 });
def("KAGE_BUNSHIN", "RASENGAN", { id: "rasen-barrage", kanji: "螺旋連丸", name: { ru: "Ураган Расенганов", en: "Rasengan Barrage" }, mult: 2 });
def("KIRIN", "SUIRYUDAN", { id: "storm-dragon", kanji: "嵐遁", name: { ru: "Грозовой дракон", en: "Storm Dragon" }, mult: 2.1 });
def("KUCHIYOSE", "GOKAKYU", { id: "toad-oil", kanji: "蝦蟇油炎", name: { ru: "Жабье масло и пламя", en: "Toad Oil Flame" }, mult: 1.9 });
// …then any pair of elements.
const EL: Record<string, TeamCombo> = {
  [pairKey("fire", "wind")]: { id: "fire-wind", kanji: "炎風", name: { ru: "Огненный смерч", en: "Fire Tornado" }, mult: 1.8 },
  [pairKey("water", "lightning")]: { id: "water-lightning", kanji: "雷水", name: { ru: "Грозовой прилив", en: "Thunder Tide" }, mult: 1.8 },
  [pairKey("chakra", "lightning")]: { id: "chakra-lightning", kanji: "雷螺", name: { ru: "Громовая спираль", en: "Thunder Spiral" }, mult: 1.6 },
  [pairKey("chakra", "wind")]: { id: "chakra-wind", kanji: "風螺", name: { ru: "Великий вихрь", en: "Great Whirlwind" }, mult: 1.6 },
  [pairKey("fire", "fire")]: { id: "fire-fire", kanji: "双炎", name: { ru: "Двойной Катон", en: "Twin Katon" }, mult: 1.5 },
  [pairKey("water", "fire")]: { id: "steam", kanji: "沸遁", name: { ru: "Кипящий пар", en: "Boil Release" }, mult: 1.5 },
  [pairKey("lightning", "lightning")]: { id: "twin-lightning", kanji: "双雷", name: { ru: "Двойная молния", en: "Twin Lightning" }, mult: 1.5 },
  [pairKey("chakra", "fire")]: { id: "chakra-fire", kanji: "火螺", name: { ru: "Пылающая сфера", en: "Blazing Sphere" }, mult: 1.4 },
  [pairKey("chakra", "chakra")]: { id: "chakra-chakra", kanji: "双螺", name: { ru: "Двойная чакра", en: "Twin Chakra" }, mult: 1.35 },
};

/** Team technique for two jutsu cast back-to-back by the two players (null = none). */
export function teamCombo(a: JutsuId, b: JutsuId): TeamCombo | null {
  if (a === b) return null;
  const named = byPair[pairKey(a, b)];
  if (named) return named;
  const ea: Element = JUTSU[a].element;
  const eb: Element = JUTSU[b].element;
  return EL[pairKey(ea, eb)] ?? { id: "team", kanji: "連携", name: { ru: "Командная атака", en: "Team Attack" }, mult: 1.3 };
}

/** Every named combo, for the rules card. */
export const NAMED_COMBOS: { a: JutsuId; b: JutsuId; combo: TeamCombo }[] = [
  { a: "RASENGAN", b: "CHIDORI", combo: byPair[pairKey("RASENGAN", "CHIDORI")] },
  { a: "RASENSHURIKEN", b: "GOKAKYU", combo: byPair[pairKey("RASENSHURIKEN", "GOKAKYU")] },
  { a: "KAGE_BUNSHIN", b: "RASENGAN", combo: byPair[pairKey("KAGE_BUNSHIN", "RASENGAN")] },
  { a: "KIRIN", b: "SUIRYUDAN", combo: byPair[pairKey("KIRIN", "SUIRYUDAN")] },
  { a: "KUCHIYOSE", b: "GOKAKYU", combo: byPair[pairKey("KUCHIYOSE", "GOKAKYU")] },
];

/** Online duel: two jutsu that meet mid-air. */
export const CLASH_WINDOW_MS = 1800;
export function clashName(a: string, b: string): L {
  const k = pairKey(a, b);
  if (k === pairKey("RASENGAN", "CHIDORI")) return { ru: "Расенган против Чидори!", en: "Rasengan vs Chidori!" };
  return { ru: "Столкновение техник!", en: "Jutsu Clash!" };
}
