/**
 * Roster. Artwork is used under the licence obtained by the project author
 * (see README → Credits & licence). Characters without artwork yet
 * (`public/assets/characters/<id>.webp` missing) fall back to a silhouette.
 *
 * Every playable character has a small perk so the choice matters:
 *   timeBonusMs   extra time on every jutsu timer
 *   dmg           damage multipliers per element ("all" applies to every jutsu)
 */
import type { Element } from "@/types/game";
import type { L } from "@/types/i18n";

export type CharacterId =
  | "naruto"
  | "naruto-six-paths"
  | "sakura"
  | "kakashi"
  | "sasuke"
  | "minato"
  | "jiraiya"
  | "hashirama"
  | "shikamaru"
  | "shisui"
  | "boruto"
  | "boruto-karma"
  | "mitsuki"
  | "kawaki"
  | "itachi"
  | "kisame"
  | "hidan"
  | "konan"
  | "pain"
  | "obito"
  | "obito-six-paths"
  | "madara"
  | "madara-six-paths"
  | "isshiki";

export interface Character {
  id: CharacterId;
  name: L;
  title: L;
  image: string;
  /** Glyph shown on the silhouette when no artwork is available. */
  glyph: string;
  color: string;
  villain: boolean;
  /** Can be picked as the player's character. */
  playable: boolean;
  /** Badge on the select card. */
  tag?: L;
  perk: L;
  timeBonusMs: number;
  dmg: Partial<Record<Element | "all", number>>;
}

const img = (id: string) => `/assets/characters/${id}.webp`;

function c(
  id: CharacterId,
  name: L,
  title: L,
  color: string,
  glyph: string,
  opts: { villain?: boolean; playable?: boolean; tag?: L; perk?: L; timeBonusMs?: number; dmg?: Character["dmg"] } = {},
): Character {
  return {
    id,
    name,
    title,
    image: img(id),
    glyph,
    color,
    villain: opts.villain ?? false,
    playable: opts.playable ?? true,
    tag: opts.tag,
    perk: opts.perk ?? { ru: "—", en: "—" },
    timeBonusMs: opts.timeBonusMs ?? 0,
    dmg: opts.dmg ?? {},
  };
}

export const CHARACTERS: Record<CharacterId, Character> = {
  naruto: c("naruto", { ru: "Наруто", en: "Naruto" }, { ru: "Неудержимый генин", en: "Unstoppable Genin" }, "#ff8a1f", "鳴", {
    perk: { ru: "+3 с на каждую технику", en: "+3s on every jutsu" },
    timeBonusMs: 3000,
  }),
  sakura: c("sakura", { ru: "Сакура", en: "Sakura" }, { ru: "Точность чакры", en: "Chakra Precision" }, "#ff7eb6", "桜", {
    perk: { ru: "+10% урона ко всем техникам", en: "+10% damage to all jutsu" },
    dmg: { all: 1.1 },
  }),
  kakashi: c("kakashi", { ru: "Какаши", en: "Kakashi" }, { ru: "Ниндзя-копировщик", en: "Copy Ninja" }, "#8fb3c9", "案", {
    perk: { ru: "+25% к технике молнии", en: "+25% Lightning damage" },
    dmg: { lightning: 1.25 },
  }),
  sasuke: c("sasuke", { ru: "Саске", en: "Sasuke" }, { ru: "Последний мститель", en: "Last Avenger" }, "#7b6cff", "佐", {
    perk: { ru: "+15% к молнии и огню", en: "+15% Lightning, +15% Fire" },
    dmg: { lightning: 1.15, fire: 1.15 },
  }),
  minato: c("minato", { ru: "Минато", en: "Minato" }, { ru: "Жёлтая вспышка", en: "Yellow Flash" }, "#ffd23f", "閃", {
    perk: { ru: "+4 с на каждую технику", en: "+4s on every jutsu" },
    timeBonusMs: 4000,
  }),
  hashirama: c("hashirama", { ru: "Хаширама", en: "Hashirama" }, { ru: "Бог шиноби", en: "God of Shinobi" }, "#3fae5a", "柱", {
    perk: { ru: "+25% к технике воды, +10% к чакре", en: "+25% Water, +10% Chakra" },
    dmg: { water: 1.25, chakra: 1.1 },
  }),
  itachi: c("itachi", { ru: "Итачи", en: "Itachi" }, { ru: "Иллюзионист воронов", en: "Crow Illusionist" }, "#d7263d", "鼬", {
    villain: true,
    tag: { ru: "ОТСТУПНИК", en: "ROGUE" },
    perk: { ru: "+25% к технике огня", en: "+25% Fire damage" },
    dmg: { fire: 1.25 },
  }),
  madara: c("madara", { ru: "Мадара", en: "Madara" }, { ru: "Призрак Учиха", en: "Ghost of the Uchiha" }, "#b3122e", "斑", {
    villain: true,
    tag: { ru: "ОТСТУПНИК", en: "ROGUE" },
    perk: { ru: "+20% к огню, +2 с", en: "+20% Fire, +2s" },
    timeBonusMs: 2000,
    dmg: { fire: 1.2 },
  }),
  obito: c("obito", { ru: "Обито", en: "Obito" }, { ru: "Человек в маске", en: "Masked Man" }, "#5b4b9a", "帯", {
    villain: true,
    tag: { ru: "ОТСТУПНИК", en: "ROGUE" },
    perk: { ru: "+2 с, +10% урона", en: "+2s, +10% all damage" },
    timeBonusMs: 2000,
    dmg: { all: 1.1 },
  }),
  "obito-six-paths": c("obito-six-paths", { ru: "Обито", en: "Obito" }, { ru: "Джинчурики Десятихвостого", en: "Ten-Tails Jinchūriki" }, "#e8f0e8", "十", {
    villain: true,
    tag: { ru: "ШЕСТЬ ПУТЕЙ", en: "SIX PATHS" },
    perk: { ru: "+20% урона, −2 с", en: "+20% all damage, −2s" },
    timeBonusMs: -2000,
    dmg: { all: 1.2 },
  }),
  "madara-six-paths": c("madara-six-paths", { ru: "Мадара", en: "Madara" }, { ru: "Джинчурики Десятихвостого", en: "Ten-Tails Jinchūriki" }, "#d9d4e8", "輪", {
    villain: true,
    tag: { ru: "ШЕСТЬ ПУТЕЙ", en: "SIX PATHS" },
    perk: { ru: "+25% урона ко всему", en: "+25% all damage" },
    dmg: { all: 1.25 },
  }),
  kisame: c("kisame", { ru: "Кисаме", en: "Kisame" }, { ru: "Хвостатый зверь без хвоста", en: "Tailless Tailed Beast" }, "#4f7ca8", "鮫", {
    villain: true,
    tag: { ru: "АКАЦУКИ", en: "AKATSUKI" },
    perk: { ru: "+35% к технике воды", en: "+35% Water damage" },
    dmg: { water: 1.35 },
  }),
  hidan: c("hidan", { ru: "Хидан", en: "Hidan" }, { ru: "Бессмертный фанатик", en: "Immortal Zealot" }, "#c4c4cc", "飛", {
    villain: true,
    tag: { ru: "АКАЦУКИ", en: "AKATSUKI" },
    perk: { ru: "+25% урона, −3 с", en: "+25% all damage, −3s" },
    timeBonusMs: -3000,
    dmg: { all: 1.25 },
  }),
  konan: c("konan", { ru: "Конан", en: "Konan" }, { ru: "Бумажный ангел", en: "Paper Angel" }, "#8f8fd8", "紙", {
    villain: true,
    tag: { ru: "АКАЦУКИ", en: "AKATSUKI" },
    perk: { ru: "+25% к чакре, +2 с", en: "+25% Chakra, +2s" },
    timeBonusMs: 2000,
    dmg: { chakra: 1.25 },
  }),
  pain: c("pain", { ru: "Пейн", en: "Pain" }, { ru: "Бог Деревни Дождя", en: "God of the Rain Village" }, "#e0773a", "痛", {
    villain: true,
    tag: { ru: "АКАЦУКИ", en: "AKATSUKI" },
    perk: { ru: "+15% урона, +1 с", en: "+15% all damage, +1s" },
    timeBonusMs: 1000,
    dmg: { all: 1.15 },
  }),
  isshiki: c("isshiki", { ru: "Иссики", en: "Isshiki" }, { ru: "Оцуцуки из далёкого мира", en: "Ōtsutsuki from Beyond" }, "#b3122e", "一", {
    villain: true,
    tag: { ru: "ОЦУЦУКИ", en: "ŌTSUTSUKI" },
    perk: { ru: "+30% урона, −3 с", en: "+30% all damage, −3s" },
    timeBonusMs: -3000,
    dmg: { all: 1.3 },
  }),
  "naruto-six-paths": c("naruto-six-paths", { ru: "Наруто", en: "Naruto" }, { ru: "Режим мудреца Шести Путей", en: "Six Paths Sage Mode" }, "#ffb400", "仙", {
    tag: { ru: "ШЕСТЬ ПУТЕЙ", en: "SIX PATHS" },
    perk: { ru: "+15% урона, +2 с", en: "+15% all damage, +2s" },
    timeBonusMs: 2000,
    dmg: { all: 1.15 },
  }),
  jiraiya: c("jiraiya", { ru: "Джирайя", en: "Jiraiya" }, { ru: "Отшельник жабьей горы", en: "Toad Sage" }, "#c9483a", "蝦", {
    perk: { ru: "+20% к огню и призыву", en: "+20% Fire and Chakra" },
    dmg: { fire: 1.2, chakra: 1.2 },
  }),
  shikamaru: c("shikamaru", { ru: "Шикамару", en: "Shikamaru" }, { ru: "Стратег теней", en: "Shadow Strategist" }, "#5d7d5a", "影", {
    perk: { ru: "+5 с на каждую технику", en: "+5s on every jutsu" },
    timeBonusMs: 5000,
  }),
  shisui: c("shisui", { ru: "Шисуи", en: "Shisui" }, { ru: "Мерцающий Шисуи", en: "Shisui of the Body Flicker" }, "#4f5f3a", "瞬", {
    perk: { ru: "+30% к технике чакры", en: "+30% Chakra damage" },
    dmg: { chakra: 1.3 },
  }),
  boruto: c("boruto", { ru: "Боруто", en: "Boruto" }, { ru: "Новое поколение", en: "The Next Generation" }, "#ffd84d", "人", {
    perk: { ru: "+15% к молнии, +2 с", en: "+15% Lightning, +2s" },
    timeBonusMs: 2000,
    dmg: { lightning: 1.15 },
  }),
  "boruto-karma": c("boruto-karma", { ru: "Боруто", en: "Boruto" }, { ru: "Пробуждённая Карма", en: "Karma Awakened" }, "#3aa0ff", "楔", {
    tag: { ru: "КАРМА", en: "KARMA" },
    perk: { ru: "+15% урона ко всему", en: "+15% all damage" },
    dmg: { all: 1.15 },
  }),
  mitsuki: c("mitsuki", { ru: "Мицуки", en: "Mitsuki" }, { ru: "Дитя змеиного саннина", en: "Child of the Snake Sannin" }, "#8fd3ff", "月", {
    perk: { ru: "+20% к молнии", en: "+20% Lightning damage" },
    dmg: { lightning: 1.2 },
  }),
  kawaki: c("kawaki", { ru: "Каваки", en: "Kawaki" }, { ru: "Сосуд Карасу", en: "Vessel of Kara" }, "#3a5ea8", "器", {
    villain: true,
    tag: { ru: "КАРА", en: "KARA" },
    perk: { ru: "+20% урона, −2 с", en: "+20% all damage, −2s" },
    timeBonusMs: -2000,
    dmg: { all: 1.2 },
  }),
};

/** Display order on the select screen: heroes first, then rogues. */
const ORDER: CharacterId[] = [
  "naruto", "naruto-six-paths", "sasuke", "sakura", "kakashi", "minato", "jiraiya", "hashirama",
  "shikamaru", "shisui", "boruto", "boruto-karma", "mitsuki",
  "itachi", "kisame", "hidan", "konan", "pain", "kawaki", "obito", "obito-six-paths", "madara", "madara-six-paths", "isshiki",
];

export const CHARACTER_LIST: Character[] = ORDER.map((id) => CHARACTERS[id]);
export const PLAYABLE: Character[] = CHARACTER_LIST.filter((x) => x.playable);

/** Quick-battle opponents. */
export const VILLAINS: CharacterId[] = CHARACTER_LIST.filter((x) => x.villain).map((x) => x.id);

/** Deterministic default opponent (strongest one that isn't the player). */
export function bossFor(player: CharacterId): CharacterId {
  const order: CharacterId[] = ["madara", "obito-six-paths", "itachi", "pain", "obito"];
  return order.find((b) => b !== player) ?? "madara";
}

/** Random quick-battle opponent that isn't the player. */
export function randomBossFor(player: CharacterId, rnd = Math.random): CharacterId {
  const pool = VILLAINS.filter((v) => v !== player && !v.startsWith(player) && !player.startsWith(v));
  return pool[Math.floor(rnd() * pool.length)] ?? bossFor(player);
}

/** The mentor who guides the story; never the player themselves. */
export function mentorFor(player: CharacterId | null): CharacterId {
  return player === "kakashi" ? "jiraiya" : "kakashi";
}

export function damageMultiplier(ch: Character | null, el: Element): number {
  if (!ch) return 1;
  return (ch.dmg.all ?? 1) * (ch.dmg[el] ?? 1);
}
