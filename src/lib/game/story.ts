/**
 * Story: 13 chapters in four arcs. Each chapter has a location, a villain, new
 * jutsu, a visual-novel scene before and after the fight, and a mid-fight
 * exchange (the villain's taunt at half HP + the hero's reply).
 * All dialogue is original writing for this game. Placeholders: {hero}, {mentor}, {enemy}.
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

export interface Arc {
  title: L;
  kanji: string;
}

export const ARCS: Arc[] = [
  { title: { ru: "Часть I · Путь генина", en: "Part I · The Genin's Path" }, kanji: "壱" },
  { title: { ru: "Часть II · Тень Акацуки", en: "Part II · Shadow of the Akatsuki" }, kanji: "弐" },
  { title: { ru: "Часть III · Четвёртая война", en: "Part III · The Fourth War" }, kanji: "参" },
  { title: { ru: "Часть IV · Новое поколение", en: "Part IV · The Next Generation" }, kanji: "肆" },
];

export interface Chapter {
  arc: number;
  title: L;
  location: LocationId;
  /** "mentor" = the story mentor spars with the player. */
  enemy: CharacterId | "mentor";
  hp: number;
  /** Jutsu learned in this chapter (earlier ones stay available). */
  unlocks: JutsuId[];
  intro: Line[];
  outro: Line[];
  /** Said by the enemy when their HP drops below half… */
  taunt: L;
  /** …and the hero's answer. */
  reply: L;
}

const N = (ru: string, en: string): Line => ({ speaker: "narrator", text: { ru, en } });
const H = (ru: string, en: string): Line => ({ speaker: "hero", text: { ru, en } });
const M = (ru: string, en: string): Line => ({ speaker: "mentor", text: { ru, en } });
const E = (ru: string, en: string): Line => ({ speaker: "enemy", text: { ru, en } });
const T = (ru: string, en: string): L => ({ ru, en });

export const CHAPTERS: Chapter[] = [
  // ───────────────────────────── PART I ─────────────────────────────
  {
    arc: 0,
    title: T("Выпускной экзамен", "Graduation Exam"),
    location: "academy",
    enemy: "mentor",
    hp: 600,
    unlocks: ["HENGE", "KAWARIMI", "KAGE_BUNSHIN"],
    intro: [
      N("Академия ниндзя. Рассвет. Во дворе пахнет пылью и свежей краской мишеней.", "The Ninja Academy at dawn. The yard smells of dust and freshly painted targets."),
      M("Печати — язык чакры, {hero}. Ошибёшься хоть одним пальцем — техника развалится у тебя в руках.", "Hand seals are the language of chakra, {hero}. One wrong finger and the technique falls apart in your hands."),
      H("Я тренировался всю ночь. Пальцы ещё помнят.", "I trained all night. My fingers still remember."),
      M("Тогда слушай правила. Перед боем выбираешь ТРИ техники. Больше никаких «подумать между раундами».", "Then listen. Before the fight you pick THREE techniques. No more 'thinking it over between rounds'."),
      M("Замена ставит щит. Клоны удваивают следующий удар. Превращение сбивает врага с толку.", "Substitution raises a shield. Clones double your next strike. Transformation throws the enemy off."),
      M("И помни: каждая неверная печать стоит чакры и времени. Чистая техника — враг даже не успеет ответить.", "And remember: every wrong seal costs chakra and time. Cast it clean and the enemy won't even get to answer."),
      H("Понял. Точность дороже скорости.", "Got it. Precision beats speed."),
    ],
    outro: [
      M("Руки быстрые, голова холодная. Неплохо, {hero}.", "Quick hands, cool head. Not bad, {hero}."),
      H("Значит, протектор мой?", "So the headband is mine?"),
      M("Твой. А вместе с ним — первое задание: проводить мостостроителя до Страны Волн.", "Yours. And with it, your first mission: escort a bridge builder to the Land of Waves."),
      N("Никто ещё не знал, что в тумане у моста их уже ждут.", "No one knew yet that something was waiting for them in the mist by the bridge."),
    ],
    taunt: T("Не торопись. Скорость без точности ничего не стоит.", "Don't rush. Speed without precision is worthless."),
    reply: T("Тогда смотри, как я делаю и то, и другое!", "Then watch me do both!"),
  },
  {
    arc: 0,
    title: T("Акула в тумане", "Shark in the Mist"),
    location: "bridge",
    enemy: "kisame",
    hp: 850,
    unlocks: ["GOKAKYU"],
    intro: [
      N("Страна Волн. Туман такой густой, что недостроенный мост тонет в нём через десять шагов.", "The Land of Waves. The mist is so thick the unfinished bridge vanishes after ten steps."),
      N("Из белой пелены выступает огромная фигура с мечом, обмотанным бинтами.", "A huge figure steps out of the white haze, a bandage-wrapped sword on its shoulder."),
      E("Мостостроитель и детский эскорт… Мой меч сегодня останется голодным.", "A bridge builder and a child escort… My sword will go hungry today."),
      H("Эскорт умеет кусаться.", "This escort bites."),
      M("Он питается чакрой, {hero}. Не трать её на ошибки — каждая неверная печать ему только на руку.", "He feeds on chakra, {hero}. Don't waste it on mistakes — every wrong seal plays into his hands."),
      M("Возьми Огненный шар. Пламя горит ещё три раунда после удара — туман его не потушит.", "Take the Great Fireball. The flames keep burning for three rounds — no mist can put them out."),
    ],
    outro: [
      E("Ха… Огонь в тумане. Забавно. Мы ещё встретимся, малёк.", "Heh… Fire in the mist. Amusing. We'll meet again, little fish."),
      N("Он растворился в воде так же тихо, как появился. Мост достроили через неделю.", "He sank into the water as quietly as he came. The bridge was finished a week later."),
      M("Вернёмся в деревню. Скоро экзамен на чунина — и там тебя ждёт кое-кто пострашнее акулы.", "Back to the village. The Chūnin Exams are near — and someone scarier than a shark is waiting there."),
      H("Кто?", "Who?"),
      M("Соперник.", "A rival."),
    ],
    taunt: T("Твоя чакра пахнет страхом. Вкусно.", "Your chakra smells of fear. Delicious."),
    reply: T("Это не страх. Это огонь.", "That's not fear. That's fire."),
  },
  {
    arc: 0,
    title: T("Арена соперников", "Arena of Rivals"),
    location: "arena",
    enemy: "sasuke",
    hp: 950,
    unlocks: ["CHIDORI"],
    intro: [
      N("Финал экзамена на чунина. Трибуны гудят, как растревоженный улей.", "The Chūnin Exam finals. The stands buzz like a kicked hive."),
      E("Наконец-то. Я ждал этого боя с академии.", "Finally. I've waited for this fight since the Academy."),
      H("Я тоже. Только не жди, что я поддамся.", "Me too. Just don't expect me to go easy."),
      E("Поддашься? Ты даже печати складываешь медленнее меня.", "Go easy? You can't even form seals as fast as I can."),
      M("Он быстрый, но гордый, {hero}. Выучи Чидори: идеально сложенный, он бьёт почти вдвое сильнее.", "He's fast, but proud, {hero}. Learn Chidori: cast perfectly, it hits almost twice as hard."),
      M("Идеально — значит без единой ошибки. Одна лишняя печать — и молния просто искрит.", "Perfectly means without a single mistake. One stray seal and the lightning just sparks."),
    ],
    outro: [
      E("…Ты стал сильнее. Не думай, что это конец.", "…You've got stronger. Don't think this is over."),
      H("Я и не думаю. В следующий раз — снова ты и я.", "I don't. Next time — you and me again."),
      N("Экзамен сорвался: на деревню напали. Но это была лишь разведка.", "The exam was cut short: the village came under attack. But it was only a probe."),
      N("Где-то в лесу на краю земель Листа уже шли двое в плащах с красными облаками.", "Somewhere in the woods at the edge of Leaf lands, two figures in red-clouded cloaks were already walking."),
    ],
    taunt: T("Слишком медленно. Я вижу каждую твою печать.", "Too slow. I can see every seal you make."),
    reply: T("Видеть — не значит успеть!", "Seeing isn't the same as stopping!"),
  },

  // ───────────────────────────── PART II ────────────────────────────
  {
    arc: 1,
    title: T("Бессмертный", "The Immortal"),
    location: "forest",
    enemy: "hidan",
    hp: 1050,
    unlocks: ["RYUKA"],
    intro: [
      N("Лес Смерти. Деревья здесь такие старые, что их корни помнят войны кланов.", "The Forest of Death. The trees here are so old their roots remember the clan wars."),
      E("Ещё одна жертва для моего бога. Молись, мелкий, — это хотя бы весело.", "Another offering for my god. Pray, kid — at least it's fun."),
      H("Я не молюсь. Я складываю печати.", "I don't pray. I form seals."),
      M("Его не убить обычным ударом, {hero}. Жги его: Пламя дракона горит сильнее, но короче Огненного шара.", "Ordinary blows won't kill him, {hero}. Burn him: Dragon Flame burns hotter but shorter than the Fireball."),
      M("И держи щит под рукой. Если техника сорвётся — он ударит в полную силу.", "And keep a shield ready. If a jutsu fails, he'll hit you at full strength."),
    ],
    outro: [
      E("Больно… как же это прекрасно больно…", "It hurts… it hurts so beautifully…"),
      N("Корни леса сомкнулись над ним. Надолго ли — не знал никто.", "The forest roots closed over him. For how long, no one knew."),
      M("Он был лишь пешкой. Акацуки охотятся на джинчурики — и следующим может стать любой из нас.", "He was only a pawn. The Akatsuki hunt jinchūriki — and any of us could be next."),
      H("Тогда я найду их первым.", "Then I'll find them first."),
    ],
    taunt: T("Больно? Это только начало ритуала!", "Does it hurt? The ritual has only begun!"),
    reply: T("Твой ритуал закончится здесь.", "Your ritual ends here."),
  },
  {
    arc: 1,
    title: T("Ночь красной луны", "Night of the Red Moon"),
    location: "konohanight",
    enemy: "itachi",
    hp: 1150,
    unlocks: ["RASENGAN"],
    intro: [
      N("Коноха спит. Над скалой Хокаге висит луна цвета крови.", "The Leaf sleeps. A blood-coloured moon hangs over the Hokage Rock."),
      N("На крыше стоит человек. Вороны садятся ему на плечи, не боясь.", "A man stands on a rooftop. Crows land on his shoulders without fear."),
      E("Ты пришёл один. Смело. Или глупо.", "You came alone. Brave. Or foolish."),
      H("Зачем ты вернулся в деревню, которую предал?", "Why come back to the village you betrayed?"),
      E("Чтобы посмотреть, чему она научила следующих.", "To see what it has taught the next ones."),
      M("{hero}, его глаза видят иллюзии насквозь — и твои ошибки тоже. Я покажу тебе Расенган.", "{hero}, his eyes see through illusions — and your mistakes too. I'll show you the Rasengan."),
      M("В нём нет хитростей. Только чистая сила. Три особые печати — Противостояние, Дух, Лис.", "It has no tricks. Just pure force. Three special seals — Confrontation, Spirit, Fox."),
    ],
    outro: [
      E("Хорошо. Ты не колеблешься.", "Good. You don't hesitate."),
      N("Он рассыпался стаей воронов и исчез в красной ночи.", "He scattered into a flock of crows and vanished into the red night."),
      H("Он… проверял меня?", "Was he… testing me?"),
      M("Возможно. Но их лидер не станет проверять. Он ждёт в Деревне Скрытого Дождя.", "Perhaps. Their leader won't test you, though. He waits in the Village Hidden in the Rain."),
    ],
    taunt: T("Всё, что ты видишь, — иллюзия.", "Everything you see is an illusion."),
    reply: T("Тогда эта иллюзия сейчас тебя ударит!", "Then this illusion is about to hit you!"),
  },
  {
    arc: 1,
    title: T("Бумажный ангел", "The Paper Angel"),
    location: "rain",
    enemy: "konan",
    hp: 1250,
    unlocks: ["SUIRYUDAN"],
    intro: [
      N("Деревня Скрытого Дождя. Здесь не бывает солнца, только стальные башни и вечный ливень.", "The Village Hidden in the Rain. There is no sun here, only steel towers and endless rain."),
      E("Уходи. Этот дождь — слёзы нашего бога. Ты не имеешь права мочить в них ноги.", "Leave. This rain is our god's tears. You have no right to walk in it."),
      H("Я пришёл за тем, кто стоит за Акацуки.", "I came for the one behind the Akatsuki."),
      E("Тогда сначала пройди сквозь меня. Тысяча листов бумаги — тысяча лезвий.", "Then first get through me. A thousand sheets of paper — a thousand blades."),
      M("Дождь тебе на руку, {hero}. Водяной дракон бьёт и возвращает тебе чакру — бой будет долгим.", "The rain is on your side, {hero}. The Water Dragon hits AND restores your chakra — this will be a long fight."),
    ],
    outro: [
      E("Мокрая бумага… не режет. Какая глупая ошибка.", "Wet paper… doesn't cut. What a foolish mistake."),
      H("Скажи, где он.", "Tell me where he is."),
      E("Тебе не нужно искать. Он уже идёт к твоей деревне.", "You don't need to look. He is already on his way to your village."),
      N("Когда {hero} вернулся, Коноха лежала в руинах.", "When {hero} returned, the Leaf lay in ruins."),
    ],
    taunt: T("Бумага мягкая, пока не станет острой.", "Paper is soft until it becomes sharp."),
    reply: T("А вода мягкая, пока не станет драконом!", "And water is soft until it becomes a dragon!"),
  },
  {
    arc: 1,
    title: T("Бог дождя", "God of the Rain"),
    location: "ruins",
    enemy: "pain",
    hp: 1400,
    unlocks: ["HOSENKA"],
    intro: [
      N("От деревни осталась воронка. Дым стелется над обломками академии.", "The village is a crater. Smoke drifts over the wreckage of the Academy."),
      E("Почувствуй боль. Осознай боль. Прими боль. Только тогда ты поймёшь мир.", "Feel pain. Know pain. Accept pain. Only then will you understand the world."),
      H("Я понял одно: ты разрушил мой дом.", "I understood one thing: you destroyed my home."),
      E("И ты хочешь ответить тем же. Вот он — круг ненависти.", "And you want to answer in kind. There it is — the cycle of hatred."),
      M("{hero}, он отталкивает любые атаки. Бей серией: Огонь феникса сильнее с каждым пунктом комбо.", "{hero}, he repels every attack. Strike in a chain: Phoenix Flower grows stronger with every point of combo."),
      M("Не ошибайся. Ни разу. Здесь каждая ошибка — это чьи-то жизни.", "Don't make mistakes. Not once. Here every mistake costs someone's life."),
    ],
    outro: [
      E("Если ты веришь, что можно разорвать этот круг… покажи.", "If you believe the cycle can be broken… show me."),
      H("Покажу. Не ненавистью — делом.", "I will. Not with hatred — with deeds."),
      N("Дождь впервые за много лет прекратился. А из руин люди начали отстраивать деревню.", "For the first time in years, the rain stopped. And from the ruins, people began to rebuild."),
      N("Но человек в оранжевой маске уже объявил войну всем пяти деревням.", "But a man in an orange mask had already declared war on all five villages."),
    ],
    taunt: T("Ты ничего не знаешь о боли.", "You know nothing of pain."),
    reply: T("Знаю. Поэтому и не сдамся.", "I do. That's why I won't give up."),
  },

  // ───────────────────────────── PART III ───────────────────────────
  {
    arc: 2,
    title: T("Человек в маске", "The Masked Man"),
    location: "battlefield",
    enemy: "obito",
    hp: 1500,
    unlocks: ["KUCHIYOSE"],
    intro: [
      N("Четвёртая великая война шиноби. Пять деревень впервые сражаются плечом к плечу.", "The Fourth Great Shinobi War. For the first time, all five villages fight shoulder to shoulder."),
      E("Союз? Смешно. Через час вы снова будете резать друг друга.", "An alliance? Laughable. In an hour you'll be cutting each other's throats again."),
      H("Не угадал. Мы стоим тут вместе.", "Wrong. We're standing here together."),
      M("Его тело проходит сквозь удары, {hero}. Призови союзника — он бьёт сам три раунда и примет один удар за тебя.", "Blows pass right through him, {hero}. Summon an ally — it attacks on its own for three rounds and takes one hit for you."),
      E("Призывай кого хочешь. Время на моей стороне.", "Summon whoever you like. Time is on my side."),
    ],
    outro: [
      N("Маска треснула. Под ней оказалось лицо, которое кто-то когда-то считал другом.", "The mask cracked. Beneath it was a face someone once called a friend."),
      E("…Слишком поздно. Десятихвостый уже пробуждается.", "…Too late. The Ten-Tails is already awakening."),
      H("Тогда мы остановим и его.", "Then we'll stop that too."),
    ],
    taunt: T("Твои удары проходят сквозь пустоту.", "Your blows pass through nothing."),
    reply: T("Мой призыв не промахивается!", "My summon doesn't miss!"),
  },
  {
    arc: 2,
    title: T("Красное небо", "Red Sky"),
    location: "redmoon",
    enemy: "obito-six-paths",
    hp: 1650,
    unlocks: ["KIRIN"],
    intro: [
      N("Небо стало багровым. Лес вокруг поля боя искривился, будто его выжгли изнутри.", "The sky turned crimson. The forest around the battlefield twisted as if burned from within."),
      E("Я — джинчурики Десятихвостого. Мне больше не нужна маска.", "I am the Ten-Tails' jinchūriki. I no longer need a mask."),
      H("Без маски тебе стало страшнее?", "Scarier without the mask, is it?"),
      M("Он слишком силён для прямого удара, {hero}. Сначала измотай его, а когда у него останется меньше 40% — бей Кирином.", "He's too strong to hit head-on, {hero}. Wear him down first — then, below 40%, strike with Kirin."),
      M("Кирин — это молния с неба. Против ослабленного врага он бьёт больше чем вдвое.", "Kirin is lightning from the sky. Against a weakened foe it hits more than twice as hard."),
    ],
    outro: [
      E("Я думал, мир можно переписать… начисто.", "I thought the world could be rewritten… from scratch."),
      H("Мир переписывают не так. Его строят заново — вместе.", "That's not how you rewrite it. You rebuild it — together."),
      N("Но за его спиной поднялся тот, кто ждал этого дня почти сто лет.", "But behind him rose the one who had waited for this day for almost a century."),
    ],
    taunt: T("Твои печати — пыль перед Шестью Путями.", "Your seals are dust before the Six Paths."),
    reply: T("Эта пыль тебя и остановит!", "Then that dust will stop you!"),
  },
  {
    arc: 2,
    title: T("Долина Завершения", "Valley of the End"),
    location: "valley",
    enemy: "madara",
    hp: 1850,
    unlocks: ["RASENSHURIKEN"],
    intro: [
      N("Долина Завершения. Два каменных великана смотрят друг на друга через водопад.", "The Valley of the End. Two stone giants face each other across the waterfall."),
      E("Я давно ждал противника, достойного этих статуй.", "I've long waited for an opponent worthy of these statues."),
      H("Ты его дождался.", "You found one."),
      E("Посмотрим. Я пережил эпоху воюющих кланов. Что ты можешь мне показать?", "We'll see. I outlived the age of warring clans. What can you possibly show me?"),
      M("Новую технику, {hero}. Расен-сюрикен — самое мощное, что у тебя будет. Но он бьёт и по тебе самому.", "A new technique, {hero}. The Rasenshuriken — the most powerful thing you'll have. But it hurts you too."),
      M("Береги чакру. Одна лишняя ошибка — и тебе не хватит сил на второй бросок.", "Save your chakra. One mistake too many and you won't have the strength for a second throw."),
    ],
    outro: [
      E("Хм… Значит, эпоха и правда сменилась.", "Hmph… So the era really has changed."),
      H("Она меняется, когда люди перестают сражаться поодиночке.", "It changes when people stop fighting alone."),
      N("Война закончилась. Прошли годы. Но с далёкой луны на Коноху уже смотрели чужие глаза.", "The war ended. Years passed. But from a distant moon, alien eyes were already watching the Leaf."),
    ],
    taunt: T("Ты лишь отсрочил неизбежное.", "You've only delayed the inevitable."),
    reply: T("Неизбежное — это наша победа!", "The only inevitable thing is our win!"),
  },

  // ───────────────────────────── PART IV ────────────────────────────
  {
    arc: 3,
    title: T("Пришелец с Луны", "The Visitor from the Moon"),
    location: "moon",
    enemy: "momoshiki",
    hp: 2000,
    unlocks: [],
    intro: [
      N("Посреди нового экзамена на чунина небо раскололось. Пришёл Момошики Оцуцуки.", "In the middle of a new Chūnin Exam the sky split open. Momoshiki Ōtsutsuki had arrived."),
      E("Я пришёл за чакрой этого мира. Вы тратите её так бездарно.", "I came for this world's chakra. You waste it so clumsily."),
      H("Эта чакра принадлежит тем, кто её защищает.", "This chakra belongs to those who protect it."),
      N("Бой перенёсся в пустынный лунный кратер, где нет ни ветра, ни звука.", "The fight moved to a lifeless lunar crater without wind or sound."),
      M("Его ладони поглощают техники, {hero}. Бей быстро и без ошибок — каждая ошибка его подкармливает.", "His palms absorb jutsu, {hero}. Strike fast and clean — every mistake feeds him."),
    ],
    outro: [
      E("Сила… у низших существ?..", "Such power… in lesser beings?.."),
      H("Вместе мы сильнее, чем ты был в одиночку.", "Together we're stronger than you ever were alone."),
      N("Исчезая, он оставил метку. Новое поколение шиноби ждали новые испытания.", "As he vanished, he left a mark. The new generation of shinobi had new trials ahead."),
    ],
    taunt: T("Ваши техники — лишь пища для моих ладоней.", "Your jutsu are nothing but food for my palms."),
    reply: T("Тогда подавись этой!", "Then choke on this one!"),
  },
  {
    arc: 3,
    title: T("Мальчик с меткой", "The Marked Boy"),
    location: "villagenight",
    enemy: "kawaki",
    hp: 1900,
    unlocks: [],
    intro: [
      N("Ночная Коноха выросла в огромный город. В её переулках появился мальчик с меткой на ладони.", "The Leaf by night has grown into a great city. A boy with a mark on his palm appeared in its alleys."),
      E("Мне не нужна твоя деревня. Мне нужно, чтобы от меня отстали.", "I don't need your village. I need everyone to leave me alone."),
      H("Никто не будет тебя преследовать. Но разрушать город я не дам.", "No one's hunting you. But I won't let you tear this city apart."),
      M("Он дерётся от страха, {hero}. Покажи, что печати — это не только оружие.", "He fights out of fear, {hero}. Show him seals aren't only a weapon."),
    ],
    outro: [
      E("…Почему ты не добил меня?", "…Why didn't you finish me?"),
      H("Потому что ты тоже можешь выбрать другой путь.", "Because you can choose another path too."),
      N("Метка на его ладони вспыхнула. Кто-то очень древний почувствовал это.", "The mark on his palm flared. Someone very old felt it."),
    ],
    taunt: T("Эта сила сожрёт и тебя.", "This power will devour you too."),
    reply: T("Моя сила — не метка. Мои руки.", "My power isn't a mark. It's my hands."),
  },
  {
    arc: 3,
    title: T("Оцуцуки", "The Ōtsutsuki"),
    location: "crater",
    enemy: "isshiki",
    hp: 2300,
    unlocks: [],
    intro: [
      N("С неба спустился Оцуцуки, веками путешествовавший между мирами.", "An Ōtsutsuki who had travelled between worlds for centuries descended from the sky."),
      E("Вы — всего лишь насекомые, которые научились складывать пальцы.", "You are mere insects that have learned to fold their fingers."),
      H("Эти «насекомые» уже побеждали богов.", "These 'insects' have beaten gods before."),
      E("Тогда я раздавлю вас медленно. Одну печать за другой.", "Then I'll crush you slowly. One seal at a time."),
      M("Весь путь, что ты прошёл, {hero}, — ради этого боя. Выбери три лучшие техники. Ошибок здесь не прощают.", "Everything you've been through, {hero}, was for this fight. Choose your three best techniques. Mistakes are not forgiven here."),
    ],
    outro: [
      E("Невозможно… Меня одолели смертные?", "Impossible… Bested by mortals?"),
      H("Мы учимся друг у друга. В этом наша сила.", "We learn from each other. That's our strength."),
      M("Ты больше не мой ученик, {hero}. Ты — тот, у кого будут учиться.", "You're not my student anymore, {hero}. You're the one others will learn from."),
      N("Конец. Легенда о шиноби, чьи руки стали оружием, только начинается.", "The end. The legend of the shinobi whose hands became a weapon is only beginning."),
    ],
    taunt: T("Смирись. Ты — лишь плод для древа.", "Submit. You are nothing but fruit for the tree."),
    reply: T("Этот плод тебе не по зубам!", "This fruit's too tough for you!"),
  },
];

/** Jutsu available in chapter `index` (everything learned so far). */
export function jutsuForChapter(index: number): JutsuId[] {
  return CHAPTERS.slice(0, index + 1).flatMap((c) => c.unlocks);
}
