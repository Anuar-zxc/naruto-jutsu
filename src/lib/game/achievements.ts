/**
 * Achievements: lifetime counters (persisted by GameSession) + a list of goals
 * checked against them. Each goal pays ryō once when it unlocks.
 */
import type { L } from "@/types/i18n";
import type { CharacterId } from "./characters";

export interface Counters {
  fights: number;
  wins: number;
  casts: number;
  perfectCasts: number;
  sageCasts: number;
  shouts: number;
  flawless: number;
  clutch: number;
  cleanWins: number;
  fastWins: number;
  bestCombo: number;
  bestWave: number;
  storyCleared: number;
  dojoMastered: number;
  duelWins: number;
  dailyWins: number;
  upgradesBought: number;
  allUpgradesMaxed: boolean;
  maxRyo: number;
  winsWith: CharacterId[];
  beaten: CharacterId[];
  boonsPicked: number;
}

export const emptyCounters = (): Counters => ({
  fights: 0,
  wins: 0,
  casts: 0,
  perfectCasts: 0,
  sageCasts: 0,
  shouts: 0,
  flawless: 0,
  clutch: 0,
  cleanWins: 0,
  fastWins: 0,
  bestCombo: 0,
  bestWave: 0,
  storyCleared: 0,
  dojoMastered: 0,
  duelWins: 0,
  dailyWins: 0,
  upgradesBought: 0,
  allUpgradesMaxed: false,
  maxRyo: 0,
  winsWith: [],
  beaten: [],
  boonsPicked: 0,
});

export type AchCategory = "battle" | "mastery" | "story" | "survival" | "world";

export interface Achievement {
  id: string;
  kanji: string;
  cat: AchCategory;
  name: L;
  desc: L;
  reward: number;
  /** Progress towards the goal: [current, target]. */
  progress: (c: Counters) => [number, number];
}

const n = (get: (c: Counters) => number, target: number) => (c: Counters): [number, number] => [Math.min(target, get(c)), target];
const has = (list: CharacterId[]) => (c: Counters): [number, number] => [list.filter((id) => c.beaten.includes(id)).length, list.length];

const AKATSUKI: CharacterId[] = ["itachi", "kisame", "hidan", "kakuzu", "deidara", "sasori", "konan", "pain", "nagato", "obito"];
const OTSUTSUKI: CharacterId[] = ["kaguya", "momoshiki", "isshiki", "indra"];
const KAGE: CharacterId[] = ["madara", "obito-six-paths", "danzo", "orochimaru"];

export const ACHIEVEMENTS: Achievement[] = [
  // battle
  { id: "first_blood", kanji: "初", cat: "battle", name: { ru: "Первая кровь", en: "First Blood" }, desc: { ru: "Выиграй первый бой", en: "Win your first fight" }, reward: 100, progress: n((c) => c.wins, 1) },
  { id: "wins_10", kanji: "忍", cat: "battle", name: { ru: "Настоящий шиноби", en: "True Shinobi" }, desc: { ru: "10 побед", en: "10 wins" }, reward: 300, progress: n((c) => c.wins, 10) },
  { id: "wins_50", kanji: "上", cat: "battle", name: { ru: "Джонин", en: "Jōnin" }, desc: { ru: "50 побед", en: "50 wins" }, reward: 1000, progress: n((c) => c.wins, 50) },
  { id: "wins_150", kanji: "影", cat: "battle", name: { ru: "Каге", en: "Kage" }, desc: { ru: "150 побед", en: "150 wins" }, reward: 3000, progress: n((c) => c.wins, 150) },
  { id: "flawless", kanji: "完", cat: "battle", name: { ru: "Безупречно", en: "Flawless" }, desc: { ru: "Победи, не потеряв ни капли чакры", en: "Win without losing any chakra" }, reward: 300, progress: n((c) => c.flawless, 1) },
  { id: "flawless_10", kanji: "神", cat: "battle", name: { ru: "Неприкасаемый", en: "Untouchable" }, desc: { ru: "10 безупречных побед", en: "10 flawless wins" }, reward: 1200, progress: n((c) => c.flawless, 10) },
  { id: "clutch", kanji: "際", cat: "battle", name: { ru: "На волоске", en: "By a Thread" }, desc: { ru: "Победи, когда у тебя ≤10% чакры", en: "Win with 10% chakra or less" }, reward: 300, progress: n((c) => c.clutch, 1) },
  { id: "clean", kanji: "正", cat: "battle", name: { ru: "Ни одной ошибки", en: "Not a Single Slip" }, desc: { ru: "Победи без единой неверной печати", en: "Win without a single wrong seal" }, reward: 250, progress: n((c) => c.cleanWins, 1) },
  { id: "fast", kanji: "閃", cat: "battle", name: { ru: "Жёлтая вспышка", en: "Yellow Flash" }, desc: { ru: "Победи меньше чем за 40 секунд печатей", en: "Win in under 40 seconds of sealing" }, reward: 400, progress: n((c) => c.fastWins, 1) },
  // mastery
  { id: "perfect_10", kanji: "精", cat: "mastery", name: { ru: "Точные руки", en: "Precise Hands" }, desc: { ru: "10 идеальных техник", en: "10 perfect jutsu" }, reward: 200, progress: n((c) => c.perfectCasts, 10) },
  { id: "perfect_100", kanji: "印", cat: "mastery", name: { ru: "Мастер печатей", en: "Seal Master" }, desc: { ru: "100 идеальных техник", en: "100 perfect jutsu" }, reward: 800, progress: n((c) => c.perfectCasts, 100) },
  { id: "combo_12", kanji: "連", cat: "mastery", name: { ru: "Серия", en: "Chain" }, desc: { ru: "Комбо из 12 печатей", en: "A 12-seal combo" }, reward: 150, progress: n((c) => c.bestCombo, 12) },
  { id: "combo_30", kanji: "嵐", cat: "mastery", name: { ru: "Неудержимый", en: "Unstoppable" }, desc: { ru: "Комбо из 30 печатей", en: "A 30-seal combo" }, reward: 600, progress: n((c) => c.bestCombo, 30) },
  { id: "sage_1", kanji: "仙", cat: "mastery", name: { ru: "Режим мудреца", en: "Sage Mode" }, desc: { ru: "Проведи технику в режиме мудреца", en: "Cast a jutsu in sage mode" }, reward: 150, progress: n((c) => c.sageCasts, 1) },
  { id: "sage_25", kanji: "蝦", cat: "mastery", name: { ru: "Жабий отшельник", en: "Toad Hermit" }, desc: { ru: "25 техник в режиме мудреца", en: "25 sage-mode jutsu" }, reward: 700, progress: n((c) => c.sageCasts, 25) },
  { id: "shout_1", kanji: "叫", cat: "mastery", name: { ru: "Крик души", en: "Battle Cry" }, desc: { ru: "Выкрикни название техники", en: "Shout a jutsu's name" }, reward: 150, progress: n((c) => c.shouts, 1) },
  { id: "shout_50", kanji: "吼", cat: "mastery", name: { ru: "Громче всех", en: "Loudest in the Village" }, desc: { ru: "50 выкрикнутых техник", en: "Shout 50 jutsu names" }, reward: 600, progress: n((c) => c.shouts, 50) },
  { id: "dojo_12", kanji: "修", cat: "mastery", name: { ru: "Ученик додзё", en: "Dojo Student" }, desc: { ru: "Освой 12 печатей в Додзё", en: "Master 12 seals in the Dojo" }, reward: 200, progress: n((c) => c.dojoMastered, 12) },
  { id: "dojo_24", kanji: "極", cat: "mastery", name: { ru: "Все 24 печати", en: "All 24 Seals" }, desc: { ru: "Освой все печати в Додзё", en: "Master every seal in the Dojo" }, reward: 600, progress: n((c) => c.dojoMastered, 24) },
  // story
  { id: "story_8", kanji: "壱", cat: "story", name: { ru: "Путь генина", en: "The Genin's Path" }, desc: { ru: "Пройди Часть I", en: "Clear Part I" }, reward: 300, progress: n((c) => c.storyCleared, 8) },
  { id: "story_17", kanji: "弐", cat: "story", name: { ru: "Охотник на Акацуки", en: "Akatsuki Hunter" }, desc: { ru: "Пройди Часть II", en: "Clear Part II" }, reward: 600, progress: n((c) => c.storyCleared, 17) },
  { id: "story_24", kanji: "参", cat: "story", name: { ru: "Герой войны", en: "War Hero" }, desc: { ru: "Пройди Часть III", en: "Clear Part III" }, reward: 1000, progress: n((c) => c.storyCleared, 24) },
  { id: "story_27", kanji: "伝", cat: "story", name: { ru: "Легенда", en: "Legend" }, desc: { ru: "Пройди всю историю", en: "Finish the whole story" }, reward: 2000, progress: n((c) => c.storyCleared, 27) },
  // survival
  { id: "wave_5", kanji: "波", cat: "survival", name: { ru: "Первый босс", en: "First Boss" }, desc: { ru: "Пройди 5 волн в Выживании", en: "Clear 5 survival waves" }, reward: 200, progress: n((c) => c.bestWave, 5) },
  { id: "wave_10", kanji: "耐", cat: "survival", name: { ru: "Выживший", en: "Survivor" }, desc: { ru: "Пройди 10 волн", en: "Clear 10 waves" }, reward: 500, progress: n((c) => c.bestWave, 10) },
  { id: "wave_20", kanji: "不", cat: "survival", name: { ru: "Бессмертный", en: "Immortal" }, desc: { ru: "Пройди 20 волн", en: "Clear 20 waves" }, reward: 1500, progress: n((c) => c.bestWave, 20) },
  { id: "boons_20", kanji: "恵", cat: "survival", name: { ru: "Коллекционер благ", en: "Boon Collector" }, desc: { ru: "Выбери 20 благословений", en: "Pick 20 boons" }, reward: 400, progress: n((c) => c.boonsPicked, 20) },
  // world
  { id: "daily_1", kanji: "日", cat: "world", name: { ru: "Испытание дня", en: "Daily Trial" }, desc: { ru: "Пройди испытание дня", en: "Beat a daily challenge" }, reward: 200, progress: n((c) => c.dailyWins, 1) },
  { id: "daily_7", kanji: "週", cat: "world", name: { ru: "Неделя дисциплины", en: "A Week of Discipline" }, desc: { ru: "7 испытаний дня", en: "7 daily challenges" }, reward: 1000, progress: n((c) => c.dailyWins, 7) },
  { id: "duel_1", kanji: "対", cat: "world", name: { ru: "Дуэлянт", en: "Duelist" }, desc: { ru: "Выиграй онлайн-дуэль", en: "Win an online duel" }, reward: 300, progress: n((c) => c.duelWins, 1) },
  { id: "duel_10", kanji: "覇", cat: "world", name: { ru: "Чемпион арены", en: "Arena Champion" }, desc: { ru: "10 побед в дуэлях", en: "10 duel wins" }, reward: 1000, progress: n((c) => c.duelWins, 10) },
  { id: "shop_1", kanji: "店", cat: "world", name: { ru: "Первая покупка", en: "First Purchase" }, desc: { ru: "Купи улучшение в лавке", en: "Buy an upgrade" }, reward: 50, progress: n((c) => c.upgradesBought, 1) },
  { id: "shop_max", kanji: "満", cat: "world", name: { ru: "Полная прокачка", en: "Fully Upgraded" }, desc: { ru: "Прокачай всё до максимума", en: "Max out every upgrade" }, reward: 1000, progress: (c) => [c.allUpgradesMaxed ? 1 : 0, 1] },
  { id: "rich", kanji: "富", cat: "world", name: { ru: "Богач", en: "Wealthy" }, desc: { ru: "Накопи 10 000 рё", en: "Hold 10,000 ryō" }, reward: 300, progress: n((c) => c.maxRyo, 10000) },
  { id: "roster_10", kanji: "多", cat: "world", name: { ru: "Многоликий", en: "Many Faces" }, desc: { ru: "Победи 10 разными бойцами", en: "Win with 10 different fighters" }, reward: 500, progress: n((c) => c.winsWith.length, 10) },
  { id: "akatsuki", kanji: "暁", cat: "world", name: { ru: "Гроза Акацуки", en: "Bane of the Akatsuki" }, desc: { ru: "Победи всех 10 членов Акацуки", en: "Defeat all 10 Akatsuki members" }, reward: 800, progress: has(AKATSUKI) },
  { id: "otsutsuki", kanji: "月", cat: "world", name: { ru: "Богоборец", en: "God Slayer" }, desc: { ru: "Победи Кагую, Момошики, Иссики и Индру", en: "Defeat Kaguya, Momoshiki, Isshiki and Indra" }, reward: 800, progress: has(OTSUTSUKI) },
  { id: "legends", kanji: "斑", cat: "world", name: { ru: "Тень легенд", en: "Shadow of Legends" }, desc: { ru: "Победи Мадару, Обито Шести Путей, Данзо и Орочимару", en: "Defeat Madara, Six Paths Obito, Danzō and Orochimaru" }, reward: 800, progress: has(KAGE) },
  { id: "creator", kanji: "創", cat: "world", name: { ru: "Рука создателя", en: "The Creator's Hand" }, desc: { ru: "Победи за Ануара", en: "Win as Anuar" }, reward: 100, progress: (c) => [c.winsWith.includes("anuar") ? 1 : 0, 1] },
  { id: "uzumaki", kanji: "渦", cat: "world", name: { ru: "Бесконечная чакра", en: "Endless Chakra" }, desc: { ru: "Победи за Аделю Узумаки", en: "Win as Adelya Uzumaki" }, reward: 100, progress: (c) => [c.winsWith.includes("adelya") ? 1 : 0, 1] },
];

export const isDone = (a: Achievement, c: Counters) => {
  const [cur, target] = a.progress(c);
  return cur >= target;
};

export const ACH_CATS: { id: AchCategory; name: L }[] = [
  { id: "battle", name: { ru: "Бой", en: "Battle" } },
  { id: "mastery", name: { ru: "Мастерство", en: "Mastery" } },
  { id: "story", name: { ru: "История", en: "Story" } },
  { id: "survival", name: { ru: "Выживание", en: "Survival" } },
  { id: "world", name: { ru: "Мир шиноби", en: "Shinobi World" } },
];
