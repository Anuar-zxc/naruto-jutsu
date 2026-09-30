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
  | "momoshiki"
  | "isshiki"
  | "rock-lee"
  | "might-guy"
  | "neji"
  | "hinata"
  | "gaara"
  | "temari"
  | "kankuro"
  | "tsunade"
  | "hiruzen"
  | "tobirama"
  | "asuma"
  | "kurenai"
  | "yamato"
  | "sai"
  | "kiba"
  | "shino"
  | "choji"
  | "ino"
  | "tenten"
  | "iruka"
  | "konohamaru"
  | "sarada"
  | "kushina"
  | "killer-bee"
  | "raikage"
  | "mei"
  | "onoki"
  | "orochimaru"
  | "kabuto"
  | "deidara"
  | "sasori"
  | "kakuzu"
  | "zabuza"
  | "haku"
  | "kimimaro"
  | "danzo"
  | "nagato"
  | "indra"
  | "kaguya";

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
  momoshiki: c("momoshiki", { ru: "Момошики", en: "Momoshiki" }, { ru: "Оцуцуки, пожирающий чакру", en: "Ōtsutsuki Chakra Devourer" }, "#d9d4e8", "桃", {
    villain: true,
    tag: { ru: "ОЦУЦУКИ", en: "ŌTSUTSUKI" },
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
  // --- v12 roster expansion ---
  "rock-lee": c("rock-lee", { ru: "Рок Ли", en: "Rock Lee" }, { ru: "Зелёный зверь тайдзюцу", en: "Taijutsu Green Beast" }, "#2f9e44", "蓮", { perk: { ru: "+4 с, +5% урона", en: "+4s, +5% all damage" }, timeBonusMs: 4000, dmg: { all: 1.05 } }),
  "might-guy": c("might-guy", { ru: "Майто Гай", en: "Might Guy" }, { ru: "Восемь врат", en: "Eight Gates" }, "#26a65b", "剛", { perk: { ru: "+20% урона ко всему", en: "+20% all damage" }, dmg: { all: 1.2 } }),
  "neji": c("neji", { ru: "Неджи", en: "Neji" }, { ru: "Гений клана Хьюга", en: "Hyūga Prodigy" }, "#cfc7b8", "寧", { perk: { ru: "+25% к чакре", en: "+25% Chakra damage" }, dmg: { chakra: 1.25 } }),
  "hinata": c("hinata", { ru: "Хината", en: "Hinata" }, { ru: "Нежный кулак", en: "Gentle Fist" }, "#8a7fd6", "雛", { perk: { ru: "+20% к чакре, +2 с", en: "+20% Chakra, +2s" }, timeBonusMs: 2000, dmg: { chakra: 1.2 } }),
  "gaara": c("gaara", { ru: "Гаара", en: "Gaara" }, { ru: "Казекаге песка", en: "Kazekage of the Sand" }, "#c0392b", "我", { tag: { ru: "КАЗЕКАГЕ", en: "KAZEKAGE" }, perk: { ru: "+3 с, +10% к ветру", en: "+3s, +10% Wind" }, timeBonusMs: 3000, dmg: { wind: 1.1 } }),
  "temari": c("temari", { ru: "Темари", en: "Temari" }, { ru: "Мастер веерного ветра", en: "Wind Fan Master" }, "#e3b04b", "扇", { perk: { ru: "+35% к ветру", en: "+35% Wind damage" }, dmg: { wind: 1.35 } }),
  "kankuro": c("kankuro", { ru: "Канкуро", en: "Kankurō" }, { ru: "Кукловод Песка", en: "Puppet Master of the Sand" }, "#6b5b7b", "傀", { perk: { ru: "+15% к чакре, +2 с", en: "+15% Chakra, +2s" }, timeBonusMs: 2000, dmg: { chakra: 1.15 } }),
  "tsunade": c("tsunade", { ru: "Цунаде", en: "Tsunade" }, { ru: "Пятая Хокаге", en: "Fifth Hokage" }, "#7fb069", "綱", { tag: { ru: "ХОКАГЕ", en: "HOKAGE" }, perk: { ru: "+20% урона, +1 с", en: "+20% all damage, +1s" }, timeBonusMs: 1000, dmg: { all: 1.2 } }),
  "hiruzen": c("hiruzen", { ru: "Хирузен", en: "Hiruzen" }, { ru: "Третий Хокаге, Профессор", en: "Third Hokage, the Professor" }, "#b8322a", "猿", { tag: { ru: "ХОКАГЕ", en: "HOKAGE" }, perk: { ru: "+15% к огню и воде, +2 с", en: "+15% Fire & Water, +2s" }, timeBonusMs: 2000, dmg: { fire: 1.15, water: 1.15 } }),
  "tobirama": c("tobirama", { ru: "Тобирама", en: "Tobirama" }, { ru: "Второй Хокаге", en: "Second Hokage" }, "#3a6bd6", "扉", { tag: { ru: "ХОКАГЕ", en: "HOKAGE" }, perk: { ru: "+35% к технике воды", en: "+35% Water damage" }, dmg: { water: 1.35 } }),
  "asuma": c("asuma", { ru: "Асума", en: "Asuma" }, { ru: "Клинки ветра", en: "Wind Blades" }, "#4a6fa5", "阿", { perk: { ru: "+30% к ветру", en: "+30% Wind damage" }, dmg: { wind: 1.3 } }),
  "kurenai": c("kurenai", { ru: "Куренай", en: "Kurenai" }, { ru: "Мастер гендзюцу", en: "Genjutsu Mistress" }, "#c2185b", "紅", { perk: { ru: "+4 с на каждую технику", en: "+4s on every jutsu" }, timeBonusMs: 4000 }),
  "yamato": c("yamato", { ru: "Ямато", en: "Yamato" }, { ru: "Стихия дерева", en: "Wood Style" }, "#8d6e4a", "木", { perk: { ru: "+20% к воде, +2 с", en: "+20% Water, +2s" }, timeBonusMs: 2000, dmg: { water: 1.2 } }),
  "sai": c("sai", { ru: "Сай", en: "Sai" }, { ru: "Художник АНБУ", en: "ANBU Ink Artist" }, "#3d3d4a", "墨", { perk: { ru: "+20% к чакре", en: "+20% Chakra damage" }, dmg: { chakra: 1.2 } }),
  "kiba": c("kiba", { ru: "Киба", en: "Kiba" }, { ru: "Клан Инузука", en: "Inuzuka Clan" }, "#a0522d", "牙", { perk: { ru: "+10% урона, +2 с", en: "+10% all damage, +2s" }, timeBonusMs: 2000, dmg: { all: 1.1 } }),
  "shino": c("shino", { ru: "Шино", en: "Shino" }, { ru: "Повелитель жуков", en: "Bug Master" }, "#556b2f", "蟲", { perk: { ru: "+5 с на каждую технику", en: "+5s on every jutsu" }, timeBonusMs: 5000 }),
  "choji": c("choji", { ru: "Чоджи", en: "Chōji" }, { ru: "Клан Акимичи", en: "Akimichi Clan" }, "#d35400", "丁", { perk: { ru: "+25% урона, −1 с", en: "+25% all damage, −1s" }, timeBonusMs: -1000, dmg: { all: 1.25 } }),
  "ino": c("ino", { ru: "Ино", en: "Ino" }, { ru: "Техника переноса разума", en: "Mind Transfer" }, "#b388eb", "井", { perk: { ru: "+20% к чакре, +1 с", en: "+20% Chakra, +1s" }, timeBonusMs: 1000, dmg: { chakra: 1.2 } }),
  "tenten": c("tenten", { ru: "Тентен", en: "Tenten" }, { ru: "Мастер оружия", en: "Weapon Mistress" }, "#c0392b", "天", { perk: { ru: "+15% к ветру и молнии", en: "+15% Wind & Lightning" }, dmg: { wind: 1.15, lightning: 1.15 } }),
  "iruka": c("iruka", { ru: "Ирука", en: "Iruka" }, { ru: "Учитель Академии", en: "Academy Sensei" }, "#5d7ea8", "海", { perk: { ru: "+6 с на каждую технику", en: "+6s on every jutsu" }, timeBonusMs: 6000 }),
  "konohamaru": c("konohamaru", { ru: "Конохамару", en: "Konohamaru" }, { ru: "Внук Третьего", en: "Grandson of the Third" }, "#e67e22", "丸", { perk: { ru: "+15% к чакре, +3 с", en: "+15% Chakra, +3s" }, timeBonusMs: 3000, dmg: { chakra: 1.15 } }),
  "sarada": c("sarada", { ru: "Сарада", en: "Sarada" }, { ru: "Будущая Хокаге", en: "Future Hokage" }, "#d63031", "眼", { perk: { ru: "+20% к молнии и огню", en: "+20% Lightning & Fire" }, dmg: { lightning: 1.2, fire: 1.2 } }),
  "kushina": c("kushina", { ru: "Кушина", en: "Kushina" }, { ru: "Красная Хабанеро", en: "Red-Hot Habanero" }, "#e84393", "玖", { perk: { ru: "+25% к чакре, +1 с", en: "+25% Chakra, +1s" }, timeBonusMs: 1000, dmg: { chakra: 1.25 } }),
  "killer-bee": c("killer-bee", { ru: "Киллер Би", en: "Killer Bee" }, { ru: "Джинчурики Восьмихвостого", en: "Eight-Tails Jinchūriki" }, "#f1c40f", "蜂", { tag: { ru: "ДЖИНЧУРИКИ", en: "JINCHŪRIKI" }, perk: { ru: "+20% к молнии, +2 с", en: "+20% Lightning, +2s" }, timeBonusMs: 2000, dmg: { lightning: 1.2 } }),
  "raikage": c("raikage", { ru: "Эй", en: "A" }, { ru: "Четвёртый Райкаге", en: "Fourth Raikage" }, "#f39c12", "雷", { tag: { ru: "РАЙКАГЕ", en: "RAIKAGE" }, perk: { ru: "+35% к молнии", en: "+35% Lightning damage" }, dmg: { lightning: 1.35 } }),
  "mei": c("mei", { ru: "Мей", en: "Mei" }, { ru: "Пятая Мизукаге", en: "Fifth Mizukage" }, "#2e86de", "霧", { tag: { ru: "МИЗУКАГЕ", en: "MIZUKAGE" }, perk: { ru: "+30% к воде и огню", en: "+30% Water & Fire" }, dmg: { water: 1.3, fire: 1.3 } }),
  "onoki": c("onoki", { ru: "Оноки", en: "Ōnoki" }, { ru: "Третий Цучикаге", en: "Third Tsuchikage" }, "#95a5a6", "土", { tag: { ru: "ЦУЧИКАГЕ", en: "TSUCHIKAGE" }, perk: { ru: "+20% урона, −1 с", en: "+20% all damage, −1s" }, timeBonusMs: -1000, dmg: { all: 1.2 } }),
  "orochimaru": c("orochimaru", { ru: "Орочимару", en: "Orochimaru" }, { ru: "Змеиный саннин", en: "Snake Sannin" }, "#6c5ce7", "蛇", { villain: true, tag: { ru: "САННИН", en: "SANNIN" }, perk: { ru: "+25% к чакре, +2 с", en: "+25% Chakra, +2s" }, timeBonusMs: 2000, dmg: { chakra: 1.25 } }),
  "kabuto": c("kabuto", { ru: "Кабуто", en: "Kabuto" }, { ru: "Режим мудреца змей", en: "Snake Sage Mode" }, "#8e8e9e", "兜", { villain: true, tag: { ru: "ОТСТУПНИК", en: "ROGUE" }, perk: { ru: "+20% к чакре и воде", en: "+20% Chakra & Water" }, dmg: { chakra: 1.2, water: 1.2 } }),
  "deidara": c("deidara", { ru: "Дейдара", en: "Deidara" }, { ru: "Искусство — это взрыв", en: "Art Is an Explosion" }, "#f6c945", "爆", { villain: true, tag: { ru: "АКАЦУКИ", en: "AKATSUKI" }, perk: { ru: "+35% к огню", en: "+35% Fire damage" }, dmg: { fire: 1.35 } }),
  "sasori": c("sasori", { ru: "Сасори", en: "Sasori" }, { ru: "Красный Песок", en: "Red Sand" }, "#c0392b", "蠍", { villain: true, tag: { ru: "АКАЦУКИ", en: "AKATSUKI" }, perk: { ru: "+25% к чакре, +1 с", en: "+25% Chakra, +1s" }, timeBonusMs: 1000, dmg: { chakra: 1.25 } }),
  "kakuzu": c("kakuzu", { ru: "Какузу", en: "Kakuzu" }, { ru: "Пять сердец", en: "Five Hearts" }, "#5d6d4e", "角", { villain: true, tag: { ru: "АКАЦУКИ", en: "AKATSUKI" }, perk: { ru: "+15% к огню, ветру, молнии, воде", en: "+15% Fire, Wind, Lightning, Water" }, dmg: { fire: 1.15, wind: 1.15, lightning: 1.15, water: 1.15 } }),
  "zabuza": c("zabuza", { ru: "Забуза", en: "Zabuza" }, { ru: "Демон Тумана", en: "Demon of the Mist" }, "#7f8c8d", "鬼", { villain: true, tag: { ru: "ОТСТУПНИК", en: "ROGUE" }, perk: { ru: "+30% к воде, −1 с", en: "+30% Water, −1s" }, timeBonusMs: -1000, dmg: { water: 1.3 } }),
  "haku": c("haku", { ru: "Хаку", en: "Haku" }, { ru: "Ледяные зеркала", en: "Crystal Ice Mirrors" }, "#74b9ff", "白", { villain: true, tag: { ru: "ОТСТУПНИК", en: "ROGUE" }, perk: { ru: "+20% к воде и ветру", en: "+20% Water & Wind" }, dmg: { water: 1.2, wind: 1.2 } }),
  "kimimaro": c("kimimaro", { ru: "Кимимаро", en: "Kimimaro" }, { ru: "Танцы костей", en: "Dance of the Bones" }, "#dfe6e9", "骨", { villain: true, tag: { ru: "ЗВУК", en: "SOUND" }, perk: { ru: "+20% урона ко всему", en: "+20% all damage" }, dmg: { all: 1.2 } }),
  "danzo": c("danzo", { ru: "Данзо", en: "Danzō" }, { ru: "Тень Корня", en: "Shadow of the Root" }, "#636e72", "根", { villain: true, tag: { ru: "КОРЕНЬ", en: "ROOT" }, perk: { ru: "+25% к ветру, +1 с", en: "+25% Wind, +1s" }, timeBonusMs: 1000, dmg: { wind: 1.25 } }),
  "nagato": c("nagato", { ru: "Нагато", en: "Nagato" }, { ru: "Носитель Риннегана", en: "Rinnegan Wielder" }, "#d35454", "長", { villain: true, tag: { ru: "АКАЦУКИ", en: "AKATSUKI" }, perk: { ru: "+25% урона, −2 с", en: "+25% all damage, −2s" }, timeBonusMs: -2000, dmg: { all: 1.25 } }),
  "indra": c("indra", { ru: "Индра", en: "Indra" }, { ru: "Сын Мудреца Шести Путей", en: "Son of the Sage of Six Paths" }, "#e0e0e0", "因", { villain: true, tag: { ru: "ОЦУЦУКИ", en: "ŌTSUTSUKI" }, perk: { ru: "+25% к молнии и огню", en: "+25% Lightning & Fire" }, dmg: { lightning: 1.25, fire: 1.25 } }),
  "kaguya": c("kaguya", { ru: "Кагуя", en: "Kaguya" }, { ru: "Богиня-кролик", en: "Rabbit Goddess" }, "#f5f0ff", "輝", { villain: true, tag: { ru: "ОЦУЦУКИ", en: "ŌTSUTSUKI" }, perk: { ru: "+35% урона, −3 с", en: "+35% all damage, −3s" }, timeBonusMs: -3000, dmg: { all: 1.35 } }),
};

/** Display order on the select screen: heroes first, then rogues. */
const ORDER: CharacterId[] = [
  "naruto", "naruto-six-paths", "sasuke", "sakura", "kakashi", "minato", "jiraiya", "hashirama",
  "shikamaru", "shisui", "boruto", "boruto-karma", "mitsuki",
  "rock-lee", "might-guy", "neji", "hinata", "gaara", "temari", "kankuro", "tsunade", "hiruzen", "tobirama", "asuma", "kurenai", "yamato", "sai", "kiba", "shino", "choji", "ino", "tenten", "iruka", "konohamaru", "sarada", "kushina", "killer-bee", "raikage", "mei", "onoki",
  "itachi", "kisame", "hidan", "konan", "pain", "kawaki", "obito", "obito-six-paths", "madara", "momoshiki", "isshiki",
  "orochimaru", "kabuto", "deidara", "sasori", "kakuzu", "zabuza", "haku", "kimimaro", "danzo", "nagato", "indra", "kaguya",
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

/** Boss-wave opponents in survival (every 5th wave). */
const SURVIVAL_BOSSES: CharacterId[] = ["madara", "kaguya", "isshiki", "momoshiki", "obito-six-paths", "pain", "itachi", "indra", "nagato", "orochimaru"];

/** Survival: a random opponent for a wave — never the player, never the same twice in a row. */
export function survivalBossFor(player: CharacterId, wave: number, previous: CharacterId | null, rnd = Math.random): CharacterId {
  const pool0 = wave % 5 === 0 ? SURVIVAL_BOSSES : VILLAINS;
  const pool = pool0.filter((v) => v !== player && v !== previous && !v.startsWith(player) && !player.startsWith(v));
  return pool[Math.floor(rnd() * pool.length)] ?? bossFor(player);
}
