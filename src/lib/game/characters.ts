/**
 * Playable roster + bosses. Artwork is used under the licence obtained by the
 * project author (see README → Credits & licence).
 *
 * Every character has a small perk so the choice matters:
 *   timeBonusMs   extra seconds on every jutsu timer
 *   dmg           damage multipliers per element ("all" applies to every jutsu)
 */
import type { Element } from "@/types/game";

export type CharacterId =
  | "naruto"
  | "sakura"
  | "kakashi"
  | "sasuke"
  | "itachi"
  | "minato"
  | "hashirama"
  | "madara"
  | "obito"
  | "obito-six-paths";

export interface Character {
  id: CharacterId;
  name: string;
  title: string;
  image: string;
  color: string;
  villain: boolean;
  /** Badge on the select card. */
  tag?: string;
  perk: string;
  timeBonusMs: number;
  dmg: Partial<Record<Element | "all", number>>;
}

const img = (id: string) => `/assets/characters/${id}.webp`;

export const CHARACTERS: Record<CharacterId, Character> = {
  naruto: { id: "naruto", name: "Naruto", title: "Unstoppable Genin", image: img("naruto"), color: "#ff8a1f", villain: false, perk: "+3s on every jutsu", timeBonusMs: 3000, dmg: {} },
  sakura: { id: "sakura", name: "Sakura", title: "Chakra Precision", image: img("sakura"), color: "#ff7eb6", villain: false, perk: "+10% damage to all jutsu", timeBonusMs: 0, dmg: { all: 1.1 } },
  kakashi: { id: "kakashi", name: "Kakashi", title: "Copy Ninja", image: img("kakashi"), color: "#8fb3c9", villain: false, perk: "+25% Lightning damage", timeBonusMs: 0, dmg: { lightning: 1.25 } },
  sasuke: { id: "sasuke", name: "Sasuke", title: "Last Avenger", image: img("sasuke"), color: "#7b6cff", villain: false, perk: "+15% Lightning, +15% Fire", timeBonusMs: 0, dmg: { lightning: 1.15, fire: 1.15 } },
  itachi: { id: "itachi", name: "Itachi", title: "Crow Illusionist", image: img("itachi"), color: "#d7263d", villain: true, perk: "+25% Fire damage", timeBonusMs: 0, dmg: { fire: 1.25 } },
  minato: { id: "minato", name: "Minato", title: "Yellow Flash", image: img("minato"), color: "#ffd23f", villain: false, perk: "+4s on every jutsu", timeBonusMs: 4000, dmg: {} },
  hashirama: { id: "hashirama", name: "Hashirama", title: "God of Shinobi", image: img("hashirama"), color: "#3fae5a", villain: false, perk: "+25% Water damage", timeBonusMs: 0, dmg: { water: 1.25 } },
  madara: { id: "madara", name: "Madara", title: "Ghost of the Uchiha", image: img("madara"), color: "#b3122e", villain: true, perk: "+20% Fire, +2s", timeBonusMs: 2000, dmg: { fire: 1.2 } },
  obito: { id: "obito", name: "Obito", title: "Masked Man", image: img("obito"), color: "#5b4b9a", villain: true, perk: "+2s, +10% all damage", timeBonusMs: 2000, dmg: { all: 1.1 } },
  "obito-six-paths": { id: "obito-six-paths", name: "Obito", title: "Six Paths Jinchūriki", image: img("obito-six-paths"), color: "#e8f0e8", villain: true, tag: "SIX PATHS", perk: "+20% all damage, −2s", timeBonusMs: -2000, dmg: { all: 1.2 } },
};

export const CHARACTER_LIST: Character[] = Object.values(CHARACTERS);

/** Boss pool, strongest first. The boss is the first one the player did not pick. */
export const BOSS_ORDER: CharacterId[] = ["madara", "obito-six-paths", "itachi", "obito"];

export function bossFor(player: CharacterId): CharacterId {
  return BOSS_ORDER.find((b) => b !== player) ?? "madara";
}

export function damageMultiplier(c: Character | null, el: Element): number {
  if (!c) return 1;
  return (c.dmg.all ?? 1) * (c.dmg[el] ?? 1);
}

export const STAGES = [
  { id: "village", name: "Hidden Leaf Village", image: "/assets/backgrounds/village.webp" },
  { id: "valley", name: "Valley of the End", image: "/assets/backgrounds/valley.webp" },
  { id: "academy", name: "Ninja Academy", image: "/assets/backgrounds/academy.webp" },
] as const;

export function stageForRound(round: number) {
  return STAGES[(round - 1) % STAGES.length];
}
