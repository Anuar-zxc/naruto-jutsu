/**
 * Story arc: nine chapters, each with a location, a villain, new jutsu and
 * short dialogue before and after the fight. All dialogue is original writing
 * for this game. Placeholders: {hero}, {mentor}, {enemy}.
 */
import type { JutsuId } from "@/types/game";
import type { L } from "@/types/i18n";
import type { CharacterId } from "./characters";
import type { LocationId } from "./locations";

export type Speaker = "hero" | "mentor" | "enemy" | "narrator";

export interface Line {
  speaker: Speaker;
  text: L;
}

export interface Chapter {
  title: L;
  location: LocationId;
  /** "mentor" = the story mentor spars with the player. */
  enemy: CharacterId | "mentor";
  hp: number;
  /** Jutsu learned in this chapter (earlier ones stay available). */
  unlocks: JutsuId[];
  intro: Line[];
  outro: Line[];
  /** Said by the enemy when their HP drops below half. */
  taunt: L;
}

const N = (ru: string, en: string): Line => ({ speaker: "narrator", text: { ru, en } });
const H = (ru: string, en: string): Line => ({ speaker: "hero", text: { ru, en } });
const M = (ru: string, en: string): Line => ({ speaker: "mentor", text: { ru, en } });
const E = (ru: string, en: string): Line => ({ speaker: "enemy", text: { ru, en } });

export const CHAPTERS: Chapter[] = [
  {
    title: { ru: "Выпускной экзамен", en: "Graduation Exam" },
    location: "academy",
    enemy: "mentor",
    hp: 500,
    unlocks: ["HENGE", "KAWARIMI", "KAGE_BUNSHIN"],
    intro: [
      N("Академия ниндзя. День выпускного экзамена.", "The Ninja Academy. Graduation day."),
      M("Печати — язык чакры, {hero}. Ошибёшься хоть одним пальцем — техника рассыплется.", "Hand seals are the language of chakra, {hero}. One wrong finger and the technique falls apart."),
      H("Я готов. Что нужно сделать?", "I'm ready. What do I have to do?"),
      M("Попади по мне тремя базовыми техниками. Справишься — станешь генином.", "Land the three basic techniques on me. Do it, and you're a genin."),
      M("Смотри на подсказки: если печать неверная, я скажу, какой палец поправить.", "Watch the hints: if a seal is wrong, I'll tell you exactly which finger to fix."),
    ],
    outro: [
      M("Неплохо. Руки быстрые, голова холодная.", "Not bad. Quick hands, cool head."),
      H("Значит, я прошёл?", "So I passed?"),
      M("Прошёл. Первое задание — проводить мостостроителя до Страны Волн.", "You passed. First mission: escort a bridge builder to the Land of Waves."),
    ],
    taunt: { ru: "Не торопись. Скорость без точности ничего не стоит.", en: "Don't rush. Speed without precision is worthless." },
  },
  {
    title: { ru: "Акула в тумане", en: "Shark in the Mist" },
    location: "bridge",
    enemy: "kisame",
    hp: 800,
    unlocks: ["GOKAKYU"],
    intro: [
      N("Страна Волн. Недостроенный мост тонет в густом тумане.", "The Land of Waves. An unfinished bridge drowns in thick mist."),
      E("Вода здесь повсюду. А в воде я непобедим.", "There's water everywhere here. And in water, I can't be beaten."),
      H("Тогда высушим её.", "Then let's dry it out."),
      M("Огонь против воды — Великий огненный шар. Шесть печатей, сложи их без ошибок!", "Fire against water — the Great Fireball. Six seals, make them without a mistake!"),
    ],
    outro: [
      E("Хе-хе… А ты вкуснее, чем кажешься, малёк.", "Heh… You're tougher than you look, little fish."),
      H("Уходи с моста. Здесь строят дорогу, а не поле боя.", "Leave the bridge. People are building a road here, not a battlefield."),
      N("Туман рассеялся. Но в лесу у границы кто-то уже молился о новой жертве.", "The mist lifted. But in the forest by the border, someone was already praying for a new victim."),
    ],
    taunt: { ru: "Моя чакра неисчерпаема, как море.", en: "My chakra is endless, like the sea." },
  },
  {
    title: { ru: "Бессмертный", en: "The Immortal" },
    location: "forest",
    enemy: "hidan",
    hp: 1000,
    unlocks: ["CHIDORI"],
    intro: [
      N("Лес на границе Страны Огня. Между деревьями блестит тройная коса.", "A forest on the border of the Land of Fire. A triple-bladed scythe glints between the trees."),
      E("Меня нельзя убить. Так что стой смирно, это быстро.", "I can't be killed. So hold still, this'll be quick."),
      H("Убить — нет. Остановить — можно.", "Kill you — no. Stop you — yes."),
      M("Он силён вблизи. Чидори — всего три печати: Бык, Кролик, Обезьяна.", "He's deadly up close. Chidori takes just three seals: Ox, Rabbit, Monkey."),
    ],
    outro: [
      E("Тьфу… Ладно, в этот раз твоя взяла.", "Tch… Fine, you win this time."),
      H("И в следующий тоже.", "And the next time too."),
      N("Над деревней Листа сгустились облака в красных узорах.", "Above the Leaf Village, clouds with red patterns gathered."),
    ],
    taunt: { ru: "Больно? Это только начало ритуала.", en: "Does it hurt? The ritual has only begun." },
  },
  {
    title: { ru: "Вороны у ворот", en: "Crows at the Gate" },
    location: "village",
    enemy: "itachi",
    hp: 1100,
    unlocks: ["RYUKA"],
    intro: [
      N("Деревня Листа. У ворот стоит человек в чёрном плаще.", "The Leaf Village. A man in a black cloak stands at the gate."),
      E("Ты полагаешься на то, что видишь. Но глаза легко обмануть.", "You trust what you see. But eyes are easy to deceive."),
      H("Мои руки не обманешь — каждую печать я чувствую.", "You can't fool my hands — I feel every seal."),
      M("Не смотри ему в глаза, {hero}. Смотри на свои руки.", "Don't look into his eyes, {hero}. Look at your hands."),
    ],
    outro: [
      E("Хорошо. Ты смотришь туда, куда нужно.", "Good. You're looking where you should."),
      H("Зачем ты пришёл?", "Why did you come?"),
      E("Проверить, готов ли ты к тому, что будет дальше.", "To see whether you're ready for what comes next."),
      N("Он исчез в стае ворон. След вёл в деревню, где дождь не прекращается никогда.", "He vanished in a flock of crows. The trail led to a village where the rain never stops."),
    ],
    taunt: { ru: "Всё, что ты видишь, — иллюзия.", en: "Everything you see is an illusion." },
  },
  {
    title: { ru: "Бумажный ангел", en: "The Paper Angel" },
    location: "rain",
    enemy: "konan",
    hp: 1200,
    unlocks: ["SUIRYUDAN"],
    intro: [
      N("Деревня Скрытого Дождя. С неба падают не капли, а тысячи бумажных листков.", "The Hidden Rain Village. Not drops but thousands of paper sheets fall from the sky."),
      E("Дальше ты не пройдёшь. Он не принимает гостей.", "You'll go no further. He does not receive guests."),
      H("Тогда я войду без приглашения.", "Then I'll come in uninvited."),
      M("Бумага боится воды. Водяной дракон — это лишь начало длинной техники, но его хватит.", "Paper fears water. The Water Dragon is just the opening of a long technique, but it's enough."),
    ],
    outro: [
      E("Ты промочил мои крылья… Иди. Посмотри ему в глаза.", "You soaked my wings… Go. Look him in the eyes."),
      N("Бумажные листы опали. На вершине башни ждал тот, кого здесь зовут богом.", "The paper fell away. At the top of the tower waited the one they call a god here."),
    ],
    taunt: { ru: "Бумага режет не хуже стали.", en: "Paper cuts as deep as steel." },
  },
  {
    title: { ru: "Бог дождя", en: "God of the Rain" },
    location: "rain",
    enemy: "pain",
    hp: 1300,
    unlocks: [],
    intro: [
      N("Вершина башни. Дождь здесь идёт уже много лет.", "The top of the tower. It has been raining here for years."),
      E("Люди не поймут друг друга, пока не узнают одну и ту же боль.", "People will never understand each other until they share the same suffering."),
      H("А я понял другое: боль можно остановить.", "I learned something else: suffering can be stopped."),
      M("Он отталкивает любую атаку. Меняй техники — не давай ему привыкнуть.", "He repels every attack. Switch techniques — don't let him adapt."),
    ],
    outro: [
      E("Ты говоришь как тот, кто ещё верит.", "You speak like someone who still believes."),
      H("Верю. И буду верить.", "I do. And I always will."),
      N("Дождь стих впервые за много лет. Но где-то уже началась война.", "For the first time in years, the rain stopped. But somewhere, a war had begun."),
    ],
    taunt: { ru: "Мир не изменится от твоих печатей.", en: "The world won't change because of your hand seals." },
  },
  {
    title: { ru: "Человек в маске", en: "The Masked Man" },
    location: "battlefield",
    enemy: "obito",
    hp: 1400,
    unlocks: ["HOSENKA"],
    intro: [
      N("Четвёртая великая война шиноби.", "The Fourth Great Ninja War."),
      E("Этот мир — сплошная ошибка. Я перепишу его заново.", "This world is one big mistake. I'll rewrite it from scratch."),
      H("Ошибки исправляют, а не стирают.", "You fix mistakes. You don't erase them."),
      M("Атаки проходят сквозь него. Бей, когда он сам атакует, — Огонь феникса!", "Attacks pass right through him. Strike when he attacks — Phoenix Flower!"),
    ],
    outro: [
      E("Маска треснула… как и мой план.", "The mask cracked… just like my plan."),
      H("Сними её. Поговорим как люди.", "Take it off. Let's talk like people."),
      N("Вместо ответа земля задрожала: пробудилась сила Десятихвостого.", "Instead of an answer, the ground shook: the Ten-Tails' power awakened."),
    ],
    taunt: { ru: "Ты сражаешься с тем, чего не можешь коснуться.", en: "You're fighting something you can't touch." },
  },
  {
    title: { ru: "Красное небо", en: "Red Sky" },
    location: "crater",
    enemy: "obito-six-paths",
    hp: 1600,
    unlocks: ["KUCHIYOSE"],
    intro: [
      N("Небо стало красным. Над кратером парит джинчурики Десятихвостого.", "The sky turned red. The Ten-Tails' jinchūriki floats above the crater."),
      E("Теперь я сильнее всех богов шиноби.", "Now I stand above every god of the shinobi."),
      H("Сила без людей рядом — это просто одиночество.", "Power with no one beside you is just loneliness."),
      M("Позови на помощь, {hero}. Техника призыва — пять печатей.", "Call for help, {hero}. The Summoning — five seals."),
    ],
    outro: [
      E("Может быть… я выбрал не тот путь.", "Maybe… I chose the wrong path."),
      H("Ещё не поздно выбрать другой.", "It's not too late to choose another."),
      N("Но тот, кто стоял за всем этим, уже ждал в Долине Завершения.", "But the one behind it all was already waiting at the Valley of the End."),
    ],
    taunt: { ru: "Твои печати — пыль перед Шестью Путями.", en: "Your seals are dust before the Six Paths." },
  },
  {
    title: { ru: "Долина Завершения", en: "Valley of the End" },
    location: "valley",
    enemy: "madara",
    hp: 1800,
    unlocks: [],
    intro: [
      N("Долина Завершения. Две каменные статуи смотрят друг на друга через водопад.", "The Valley of the End. Two stone statues face each other across the waterfall."),
      E("Я давно ждал противника, достойного этих статуй.", "I've long waited for an opponent worthy of these statues."),
      H("Тогда смотри внимательно.", "Then watch closely."),
      M("Все техники, что ты выучил, {hero}. Сейчас или никогда.", "Every technique you've learned, {hero}. Now or never."),
    ],
    outro: [
      E("Хм… Неплохо. Но это была лишь разминка.", "Hmph… Not bad. But that was only a warm-up."),
      N("Он поглотил силу Десятихвостого. Небо затянуло белым светом.", "He absorbed the Ten-Tails' power. White light swallowed the sky."),
    ],
    taunt: { ru: "Ты лишь отсрочил неизбежное.", en: "You've only delayed the inevitable." },
  },
  {
    title: { ru: "Шесть Путей", en: "The Six Paths" },
    location: "moon",
    enemy: "madara-six-paths",
    hp: 2000,
    unlocks: [],
    intro: [
      N("Мир застыл под бледной луной. Перед тобой — Мадара, ставший джинчурики.", "The world froze under a pale moon. Before you stands Madara, now a jinchūriki."),
      E("Сон, в котором нет войн, ближе, чем ты думаешь.", "A dream with no wars is closer than you think."),
      H("Сон, в котором нет выбора, — это клетка.", "A dream with no choice is a cage."),
      M("Последний бой этой войны, {hero}. Никаких ошибок.", "The last battle of this war, {hero}. No mistakes."),
    ],
    outro: [
      E("Значит… эпоха и правда сменилась.", "So… the era really has changed."),
      H("Она меняется, когда люди перестают сражаться поодиночке.", "It changes when people stop fighting alone."),
      N("Война закончилась. Прошли годы. Выросло новое поколение шиноби.", "The war ended. Years passed. A new generation of shinobi grew up."),
    ],
    taunt: { ru: "Всё, что ты любишь, уснёт навсегда.", en: "Everything you love will sleep forever." },
  },
  {
    title: { ru: "Новое поколение", en: "The Next Generation" },
    location: "village",
    enemy: "kawaki",
    hp: 1800,
    unlocks: [],
    intro: [
      N("Годы спустя. Деревня Листа выросла в огромный город.", "Years later. The Leaf Village has grown into a huge city."),
      E("Мне не нужна твоя деревня. Мне нужно, чтобы от меня отстали.", "I don't need your village. I need everyone to leave me alone."),
      H("Никто не будет тебя преследовать. Но и разрушать город я не дам.", "No one's hunting you. But I won't let you tear this city apart."),
      M("Он дерётся от страха, {hero}. Покажи, что печати — это не только оружие.", "He fights out of fear, {hero}. Show him seals aren't only a weapon."),
    ],
    outro: [
      E("…Почему ты не добил меня?", "…Why didn't you finish me?"),
      H("Потому что ты тоже можешь выбрать другой путь.", "Because you can choose another path too."),
      N("Метка на его ладони вспыхнула. Кто-то очень древний почувствовал это.", "The mark on his palm flared. Someone very old felt it."),
    ],
    taunt: { ru: "Эта сила сожрёт и тебя.", en: "This power will devour you too." },
  },
  {
    title: { ru: "Оцуцуки", en: "The Ōtsutsuki" },
    location: "crater",
    enemy: "isshiki",
    hp: 2200,
    unlocks: [],
    intro: [
      N("С неба спустился Оцуцуки, веками путешествовавший между мирами.", "An Ōtsutsuki who has travelled between worlds for centuries descends from the sky."),
      E("Вы — всего лишь насекомые, которые научились складывать пальцы.", "You are mere insects that have learned to fold their fingers."),
      H("Эти «насекомые» уже победили богов.", "These 'insects' have already beaten gods."),
      M("Весь путь, что ты прошёл, {hero}, — ради этого боя.", "Everything you've been through, {hero}, was for this fight."),
    ],
    outro: [
      E("Невозможно… Меня одолели смертные?", "Impossible… Bested by mortals?"),
      H("Мы учимся друг у друга. В этом наша сила.", "We learn from each other. That's our strength."),
      N("Конец. Легенда о шиноби, чьи руки стали оружием, только начинается.", "The end. The legend of the shinobi whose hands became a weapon is only beginning."),
    ],
    taunt: { ru: "Смирись. Ты — лишь плод для древа.", en: "Submit. You are nothing but fruit for the tree." },
  },
];

/** Jutsu available in chapter `index` (everything learned so far). */
export function jutsuForChapter(index: number): JutsuId[] {
  return CHAPTERS.slice(0, index + 1).flatMap((c) => c.unlocks);
}
