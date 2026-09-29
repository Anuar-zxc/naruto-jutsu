/**
 * Story: 27 chapters in four parts — from the graduation exam to the last
 * Ōtsutsuki. Each chapter has a location, a villain, new jutsu, a mission
 * brief, a visual-novel scene before and after the fight (with allies stepping
 * in), and a mid-fight exchange (the villain's taunt at half HP + the reply).
 *
 * All dialogue is original writing for this game; it follows the broad path of
 * the saga but never quotes it. Placeholders: {hero}, {mentor}, {enemy}.
 * Ally lines whose speaker is the player's own character (or the chapter's
 * enemy) are dropped automatically — see linesFor().
 */
import type { JutsuId } from "@/types/game";
import type { L } from "@/types/i18n";
import type { CharacterId } from "./characters";
import type { LocationId } from "./locations";

export type Speaker = "hero" | "mentor" | "enemy" | "narrator" | "ally";

export interface Line {
  speaker: Speaker;
  /** For speaker "ally": who is talking. */
  who?: CharacterId;
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
  /** One-line mission brief shown on the chapter card. */
  brief: L;
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
const A = (who: CharacterId, ru: string, en: string): Line => ({ speaker: "ally", who, text: { ru, en } });
const T = (ru: string, en: string): L => ({ ru, en });

export const CHAPTERS: Chapter[] = [
  // ═══════════════════════════ PART I · THE GENIN'S PATH ═══════════════════════════
  {
    arc: 0,
    title: T("Выпускной экзамен", "Graduation Exam"),
    brief: T("Докажи сенсею, что твои руки готовы к протектору.", "Prove to your sensei your hands are ready for the headband."),
    location: "academy",
    enemy: "mentor",
    hp: 600,
    unlocks: ["HENGE", "KAWARIMI", "KAGE_BUNSHIN"],
    intro: [
      N("Академия ниндзя. Рассвет. Во дворе пахнет пылью и свежей краской мишеней.", "The Ninja Academy at dawn. The yard smells of dust and freshly painted targets."),
      A("iruka", "Три года ты засыпал на моих уроках, {hero}. Сегодня спать не выйдет.", "Three years you slept through my lessons, {hero}. No sleeping today."),
      H("Я не спал, Ирука-сенсей. Я… копил силы.", "I wasn't sleeping, Iruka-sensei. I was… saving my strength."),
      A("iruka", "Вот и потрать их. Экзамен принимает не я — а тот, кто станет твоим командиром.", "Then spend it. I'm not the examiner today — the one who'll lead your squad is."),
      N("С крыши спрыгивает джонин. Книга в одной руке, скука в глазах.", "A jōnin drops from the roof. A book in one hand, boredom in his eyes."),
      M("Печати — язык чакры, {hero}. Ошибёшься хоть одним пальцем — техника развалится у тебя в руках.", "Hand seals are the language of chakra, {hero}. One wrong finger and the technique falls apart in your hands."),
      M("Правила простые. Перед боем выбираешь ТРИ техники. Больше никаких «подумать между раундами».", "The rules are simple. Before the fight you pick THREE techniques. No more 'thinking it over between rounds'."),
      M("Замена ставит щит. Клоны удваивают следующий удар. Превращение сбивает врага с толку.", "Substitution raises a shield. Clones double your next strike. Transformation throws the enemy off."),
      M("И помни: каждая неверная печать стоит чакры и времени. Сложишь чисто — враг даже не успеет ответить.", "And remember: every wrong seal costs chakra and time. Cast it clean and the enemy won't even get to answer."),
      H("Понял. Точность дороже скорости.", "Got it. Precision beats speed."),
    ],
    outro: [
      M("Руки быстрые, голова холодная. Неплохо, {hero}.", "Quick hands, cool head. Not bad, {hero}."),
      A("iruka", "Держи. Он был моим, когда я выпускался. Теперь твой.", "Here. It was mine when I graduated. Now it's yours."),
      N("Металл протектора холодный. Лист на нём выцарапан чуть криво — так, как бывает только у старых вещей.", "The headband's metal is cold. The leaf on it is scratched slightly crooked, the way only old things are."),
      M("Первое задание завтра: проводить мостостроителя до Страны Волн. Обычная прогулка.", "First mission tomorrow: escort a bridge builder to the Land of Waves. A simple walk."),
      N("Прогулкой это не оказалось.", "It turned out to be anything but."),
    ],
    taunt: T("Не торопись. Скорость без точности ничего не стоит.", "Don't rush. Speed without precision is worthless."),
    reply: T("Тогда смотри, как я делаю и то, и другое!", "Then watch me do both!"),
  },
  {
    arc: 0,
    title: T("Демон Тумана", "Demon of the Mist"),
    brief: T("Защити мостостроителя от наёмника-отступника.", "Protect the bridge builder from a rogue mercenary."),
    location: "mistlake",
    enemy: "zabuza",
    hp: 700,
    unlocks: ["SUIRYUDAN"],
    intro: [
      N("Страна Волн. Озеро у дороги затянуто туманом так, что берег тонет в нём через десять шагов.", "The Land of Waves. The lake by the road is so thick with mist the shore vanishes after ten steps."),
      N("Старик-мостостроитель прячется за спиной {hero}. Его руки дрожат, и дело не в холоде.", "The old bridge builder hides behind {hero}. His hands shake, and not from the cold."),
      E("Мостостроитель и детский эскорт… Мой меч сегодня останется голодным.", "A bridge builder and a child escort… My blade will go hungry today."),
      H("Эскорт умеет кусаться.", "This escort bites."),
      E("Я вырос в Деревне Кровавого Тумана. Там выпускной экзамен сдают, убивая одноклассников.", "I grew up in the Village of the Bloody Mist. There, you graduate by killing your classmates."),
      M("Слушай внимательно, {hero}. Он мастер воды — ответь ему тем же. Водяной дракон бьёт и возвращает тебе чакру.", "Listen carefully, {hero}. He's a master of water — answer in kind. The Water Dragon hits AND gives your chakra back."),
      M("Шесть печатей. Длинная техника. Одна ошибка посередине — и дракон рассыплется в брызги.", "Six seals. A long technique. One mistake in the middle and the dragon falls apart into spray."),
      H("Тогда я не ошибусь.", "Then I won't make one."),
    ],
    outro: [
      E("Вода против воды… и мальчишка выиграл. Смешно.", "Water against water… and the kid won. Funny."),
      N("Из тумана вылетают сенбоны. Демон падает — и тут же исчезает на руках у фигуры в маске охотника.", "Senbon fly out of the mist. The demon falls — and instantly vanishes into the arms of a masked hunter-nin."),
      M("Охотник так не уносит тело, {hero}. Так уносят раненого друга.", "A hunter doesn't carry a body like that, {hero}. That's how you carry a wounded friend."),
      H("Значит, это не конец?", "So it's not over?"),
      M("Неделя. Столько ему нужно, чтобы встать. У нас неделя, чтобы стать сильнее.", "A week. That's how long he needs to stand again. We have a week to get stronger."),
    ],
    taunt: T("Восемь точек на теле, куда можно ударить. Какую выбрать?", "Eight points on the body worth striking. Which one shall I choose?"),
    reply: T("Выбирай быстрее — у тебя их всё меньше!", "Choose fast — you're running out of them!"),
  },
  {
    arc: 0,
    title: T("Ледяные зеркала", "Crystal Ice Mirrors"),
    brief: T("Прорвись сквозь купол ледяных зеркал на мосту.", "Break through the dome of ice mirrors on the bridge."),
    location: "bridge",
    enemy: "haku",
    hp: 780,
    unlocks: ["GOKAKYU"],
    intro: [
      N("Неделя прошла. Мост почти достроен. Туман снова ползёт с моря.", "The week is over. The bridge is almost finished. The mist creeps in from the sea again."),
      N("Вокруг {hero} вырастают двадцать зеркал изо льда. В каждом — одна и та же маска.", "Twenty mirrors of ice rise around {hero}. The same mask looks out of every one."),
      E("Я не хочу тебя убивать. Но он — моя причина жить. Ради него я стану оружием.", "I don't want to kill you. But he's my reason to live. For him, I'll become a weapon."),
      H("Оружием? Ты человек. Я вижу, как ты бережёшь удары.", "A weapon? You're a person. I can see you holding back your strikes."),
      M("Лёд боится огня, {hero}. Огненный шар горит ещё три раунда после удара.", "Ice fears fire, {hero}. The Great Fireball keeps burning for three rounds after it hits."),
      M("Но это шесть печатей подряд. В зеркалах легко сбиться — смотри на руки, а не на отражения.", "But it's six seals in a row. It's easy to lose count among the mirrors — watch your hands, not the reflections."),
    ],
    outro: [
      E("Мои зеркала треснули… Значит, я больше ему не нужен.", "My mirrors cracked… Then he doesn't need me anymore."),
      H("Ты нужен. Просто не как оружие.", "You're needed. Just not as a weapon."),
      N("Туман рассеялся впервые за неделю. На мосту стояли двое из Тумана — живые, уставшие, без масок.", "The mist lifted for the first time in a week. Two shinobi of the Mist stood on the bridge — alive, tired, unmasked."),
      E("…Скажи им, что мост назовут в твою честь. Старик так решил.", "…Tell them the bridge will be named after you. The old man decided."),
      M("Хорошая работа. Дома тебя ждёт экзамен на чунина. И лес, из которого возвращаются не все.", "Good work. The Chūnin Exams are waiting at home. And a forest not everyone comes back from."),
    ],
    taunt: T("Я быстрее своего отражения. Ты не успеешь.", "I'm faster than my own reflection. You won't keep up."),
    reply: T("Зато огонь быстрее льда!", "But fire is faster than ice!"),
  },
  {
    arc: 0,
    title: T("Лес Смерти", "Forest of Death"),
    brief: T("Выживи во втором туре экзамена. В лесу кто-то чужой.", "Survive the second exam round. Someone who doesn't belong is in the forest."),
    location: "forest",
    enemy: "orochimaru",
    hp: 860,
    unlocks: ["HOSENKA"],
    intro: [
      N("Второй тур экзамена на чунина. Пять дней, свиток и сорок четвёртая зона — Лес Смерти.", "Second round of the Chūnin Exams. Five days, one scroll, and Training Ground 44 — the Forest of Death."),
      A("sakura", "{hero}, стой. Птицы замолчали. Все сразу.", "{hero}, stop. The birds went quiet. All of them at once."),
      N("Из травы поднимается змея толщиной со ствол дерева. На её голове сидит человек с жёлтыми глазами.", "A snake as thick as a tree trunk rises from the grass. A man with yellow eyes sits on its head."),
      E("Какие интересные руки. Сколько лет они могли бы учиться… если бы я позволил.", "Such interesting hands. How many years they could learn… if I allowed it."),
      H("Ты не экзаменатор.", "You're no examiner."),
      E("Я — саннин. Один из трёх. Когда-то меня звали гением этой деревни.", "I am a Sannin. One of three. Once, this village called me its genius."),
      M("{hero}, не дай ему подойти. Огонь феникса — шесть малых огней. Каждый поджигает, и они горят дольше.", "{hero}, don't let him close in. Phoenix Flower — six small flames. Each one sets him alight, and they burn longer."),
      A("sakura", "Я прикрою тыл. Просто не ошибайся, ладно?", "I'll cover your back. Just don't mess up, okay?"),
    ],
    outro: [
      E("Хм. Сегодня я только смотрел. Экзамен продолжается, маленький шиноби.", "Hm. Today I was only watching. The exam goes on, little shinobi."),
      N("Змея ушла под землю. На коре дерева остался след, будто от ожога.", "The snake sank into the earth. A mark like a burn was left on the tree bark."),
      A("sakura", "Он… отпустил нас?", "Did he… let us go?"),
      M("Он получил, что хотел. Он увидел, кто в этом году сильнее всех. Будь осторожен в финале.", "He got what he came for. He saw who's the strongest this year. Be careful in the finals."),
      N("В финале {hero} ждал соперник, который никогда не улыбался. На его спине висела тыква с песком.", "In the finals, {hero} faced a rival who never smiled. A gourd full of sand hung on his back."),
    ],
    taunt: T("Бояться — это нормально. Страх делает мясо мягче.", "Being afraid is natural. Fear makes the meat tender."),
    reply: T("Я не боюсь. Я злюсь!", "I'm not scared. I'm angry!"),
  },
  {
    arc: 0,
    title: T("Песчаный демон", "The Sand Demon"),
    brief: T("Финал экзамена. Соперник, в котором живёт зверь.", "The exam final. A rival with a beast living inside him."),
    location: "arena",
    enemy: "gaara",
    hp: 940,
    unlocks: ["KUCHIYOSE"],
    intro: [
      N("Финал экзамена на чунина. Трибуны гудят, как растревоженный улей.", "The Chūnin Exam finals. The stands buzz like a kicked hive."),
      N("Напротив {hero} стоит мальчик из Песка. Вокруг его ног шуршит песок, хотя ветра нет.", "Across from {hero} stands a boy from the Sand. Sand whispers around his feet, though there's no wind."),
      E("Мать хочет твоей крови. Она давно не пила.", "Mother wants your blood. She hasn't drunk in a long time."),
      H("…Ты разговариваешь с песком?", "…Are you talking to the sand?"),
      E("Я жив, пока убиваю тех, кто доказывает, что я существую. Докажи.", "I'm alive as long as I kill those who prove I exist. Prove it."),
      A("jiraiya", "Эй, {hero}! Помнишь наш месяц тренировок? Пора звать друзей побольше.", "Hey, {hero}! Remember our month of training? Time to call bigger friends."),
      A("jiraiya", "Призыв: пять печатей и капля крови. Жаба будет бить каждый раунд, пока бой не кончится.", "Summoning: five seals and a drop of blood. The toad will strike every round until the fight ends."),
      M("Он одинок, {hero}. Одинокие дерутся отчаяннее всех. Не жалей его — но и не ненавидь.", "He's alone, {hero}. The lonely fight the most desperately. Don't pity him — but don't hate him either."),
    ],
    outro: [
      E("Почему… Почему ты сражаешься за других так, будто они — это ты?", "Why… Why do you fight for others as if they were you?"),
      H("Потому что я тоже был один. Пока они не появились.", "Because I was alone too. Until they showed up."),
      N("Песок осыпался. Мальчик из Песка впервые за много лет закрыл глаза и не увидел в темноте зверя.", "The sand fell away. For the first time in years, the boy from the Sand closed his eyes and didn't see the beast in the dark."),
      N("Но экзамен был сорван. Змеиный саннин напал на деревню. Третий Хокаге не вернулся с крыши.", "But the exam was ruined. The Snake Sannin attacked the village. The Third Hokage did not come back from the roof."),
      A("jiraiya", "Деревне нужен новый Хокаге. И я знаю, кто им станет, — если мы её найдём.", "The village needs a new Hokage. And I know who it should be — if we can find her."),
    ],
    taunt: T("Мать смеётся. Твоя кровь пахнет так же, как все остальные.", "Mother is laughing. Your blood smells like everyone else's."),
    reply: T("Тогда пусть послушает, как смеются мои жабы!", "Then let her hear how my toads laugh!"),
  },
  {
    arc: 0,
    title: T("Первый Расенган", "The First Rasengan"),
    brief: T("Найди легендарную куноичи — и защити её от шпиона.", "Find the legendary kunoichi — and protect her from a spy."),
    location: "tanzaku",
    enemy: "kabuto",
    hp: 1000,
    unlocks: ["RASENGAN"],
    intro: [
      N("Город Танзаку. Игорные дома, фонари, запах жареной рыбы. Идеальное место, чтобы спрятаться от долга.", "Tanzaku Town. Gambling halls, lanterns, the smell of grilled fish. The perfect place to hide from duty."),
      A("tsunade", "Хокаге? Это шапка для дураков. Все, кто её носил, умерли.", "Hokage? That hat is for fools. Everyone who wore it is dead."),
      H("Значит, мне она подойдёт. Я не собираюсь умирать.", "Then it'll fit me. I don't plan on dying."),
      A("tsunade", "Громко сказано для того, кто не умеет даже держать шар чакры.", "Big words from someone who can't even hold a ball of chakra."),
      N("Из-за угла выходит юноша в очках. Вежливая улыбка, пустые глаза.", "A young man with glasses steps around the corner. A polite smile, empty eyes."),
      E("Простите, что прерываю. Мой господин хочет, чтобы саннин вылечила ему руки. Остальные здесь лишние.", "Sorry to interrupt. My master wants the Sannin to heal his arms. Everyone else here is surplus."),
      A("jiraiya", "{hero}! Помнишь, как мы лопали воздушные шары? Вращение, сила, форма. Сейчас — всё сразу!", "{hero}! Remember popping those balloons? Rotation, power, shape. Now — all at once!"),
      A("jiraiya", "Расенган: Противостояние, Дух, Лис. Три особые печати. В нём нет хитростей, только чистая сила.", "Rasengan: Confrontation, Spirit, Fox. Three special seals. No tricks — just pure power."),
    ],
    outro: [
      E("Шар… из чистой чакры… Ты сделал это за неделю?", "A sphere… of pure chakra… You made that in a week?"),
      H("За шесть дней. Седьмой я спал.", "Six days. I slept on the seventh."),
      A("tsunade", "…Ты напоминаешь мне двух людей, которых я потеряла. Ладно. Я вернусь в Коноху.", "…You remind me of two people I lost. Fine. I'll come back to the Leaf."),
      N("Коноха получила Пятую Хокаге. А через месяц потеряла одного из своих — он ушёл к змее сам.", "The Leaf got its Fifth Hokage. And a month later it lost one of its own — he went to the snake of his own will."),
    ],
    taunt: T("Мои скальпели из чакры режут мышцы изнутри. Ты даже не почувствуешь.", "My chakra scalpels cut the muscles from within. You won't even feel it."),
    reply: T("А вот это ты почувствуешь!", "But you'll feel this!"),
  },
  {
    arc: 0,
    title: T("Танец костей", "Dance of the Bones"),
    brief: T("Догони похитителей. Последний страж Звука преграждает путь.", "Catch the abductors. The Sound's last guardian blocks the way."),
    location: "soundborder",
    enemy: "kimimaro",
    hp: 1080,
    unlocks: [],
    intro: [
      N("Граница Страны Звука. Четвёрка Звука уводит соратника {hero} в логово змеи.", "The Land of Sound border. The Sound Four are taking {hero}'s comrade to the snake's lair."),
      A("shikamaru", "Команда по плану: Чоджи, Неджи, Киба — каждый держит своего. {hero}, ты бежишь дальше.", "Squad as planned: Chōji, Neji, Kiba — each holds his own. {hero}, you keep running."),
      N("Из сухой травы поднимается бледный юноша. Из его ладони медленно растёт кость — как меч.", "A pale young man rises from the dry grass. A bone slowly grows from his palm — like a sword."),
      E("Господин Орочимару дал смысл моему существованию. Я отдам ему последний вздох.", "Lord Orochimaru gave my existence meaning. I'll give him my last breath."),
      H("Ты болен. Я вижу, как ты кашляешь кровью. Уйди с дороги.", "You're sick. I can see you coughing blood. Get out of the way."),
      E("Болезнь убьёт меня завтра. Ты умрёшь сегодня.", "The illness will kill me tomorrow. You'll die today."),
      A("rock-lee", "Не так быстро! Зелёный зверь Конохи прибыл! {hero}, беги — я его задержу!", "Not so fast! The Leaf's Green Beast has arrived! {hero}, run — I'll hold him!"),
      H("Нет. Сначала мы его вместе. Потом бегу.", "No. We take him down together first. Then I run."),
    ],
    outro: [
      E("Кость… сломалась? Значит, и я… наконец… отдохну.", "The bone… broke? Then I too… can finally… rest."),
      A("rock-lee", "Он дрался до конца. Уважаю. Но теперь беги, {hero}! Долина уже близко!", "He fought to the end. Respect. But run now, {hero}! The valley is close!"),
      A("gaara", "Я тоже здесь. Песок помнит, кто открыл мне глаза. Иди. Мы прикроем.", "I'm here too. The sand remembers who opened my eyes. Go. We'll cover you."),
      N("Впереди шумел водопад. Между двумя каменными статуями стоял тот, за кем {hero} бежал три дня.", "A waterfall roared ahead. Between two stone statues stood the one {hero} had chased for three days."),
    ],
    taunt: T("Мои кости крепче стали. Твои — нет.", "My bones are harder than steel. Yours are not."),
    reply: T("Зато мои друзья крепче любых костей!", "But my friends are tougher than any bone!"),
  },
  {
    arc: 0,
    title: T("Долина Завершения", "Valley of the End"),
    brief: T("Верни друга, который выбрал силу вместо дома.", "Bring back the friend who chose power over home."),
    location: "valley",
    enemy: "sasuke",
    hp: 1150,
    unlocks: ["CHIDORI"],
    intro: [
      N("Долина Завершения. Две каменные статуи основателей смотрят друг на друга через водопад.", "The Valley of the End. Two stone statues of the founders face each other across the waterfall."),
      E("Зачем ты пришёл? Здесь для тебя ничего нет.", "Why did you come? There's nothing for you here."),
      H("Здесь ты. Этого достаточно.", "You're here. That's enough."),
      E("Мне нужна сила. В деревне её не дадут. Змея — даст.", "I need power. The village won't give it to me. The snake will."),
      H("Сила, за которую платишь друзьями, — это долг, а не сила.", "Power you pay for with your friends isn't power. It's debt."),
      A("kakashi", "{hero}, я учил его Чидори. Научу и тебя: пробивает всё, а идеально сложенный бьёт почти вдвое сильнее.", "{hero}, I taught him Chidori. I'll teach you too: it pierces everything, and cast perfectly it hits almost twice as hard."),
      M("Идеально — значит без единой ошибки. Одна лишняя печать — и молния просто искрит.", "Perfectly means without a single mistake. One stray seal and the lightning just sparks."),
    ],
    outro: [
      E("…Ты догнал. Но я всё равно уйду.", "…You caught up. But I'm still leaving."),
      H("Уходи. Я всё равно приду за тобой. Сколько бы лет это ни заняло.", "Go, then. I'll still come after you. However many years it takes."),
      N("Дождь смыл кровь с камней. Две фигуры разошлись в разные стороны — как статуи над водопадом.", "The rain washed the blood off the stones. Two figures walked away in opposite directions — like the statues over the falls."),
      A("jiraiya", "Три года, {hero}. Я возьму тебя с собой. Когда вернёшься — мир будет другим. И ты тоже.", "Three years, {hero}. I'm taking you with me. When you come back, the world will be different. So will you."),
    ],
    taunt: T("Слишком медленно. Я вижу каждую твою печать.", "Too slow. I can see every seal you make."),
    reply: T("Видеть — не значит успеть!", "Seeing isn't the same as stopping!"),
  },

  // ═══════════════════════════ PART II · SHADOW OF THE AKATSUKI ═══════════════════════════
  {
    arc: 1,
    title: T("Гости в плащах", "Guests in Cloaks"),
    brief: T("Двое из Акацуки вошли в деревню. Останови того, кто с мечом.", "Two Akatsuki have entered the village. Stop the one with the sword."),
    location: "village",
    enemy: "kisame",
    hp: 1200,
    unlocks: [],
    intro: [
      N("Три года спустя. Коноха встречает {hero} запахом рамена и новой головой на скале Хокаге.", "Three years later. The Leaf greets {hero} with the smell of ramen and a new face on the Hokage Rock."),
      A("sakura", "Ты вырос! Ну… немного. Пойдём, Цунаде-сама ждёт отчёт.", "You've grown! Well… a little. Come on, Lady Tsunade wants a report."),
      N("У моста через реку стоят двое в чёрных плащах с красными облаками.", "Two figures in black cloaks with red clouds stand by the river bridge."),
      E("Надо же, мальчик вернулся. Вкусная чакра, свежая. Мой меч скучал по таким.", "Well, the boy is back. Tasty chakra, fresh. My sword has missed that kind."),
      A("asuma", "Отойди, {hero}. Это Кисаме, Хвостатый зверь без хвоста. Его меч ест чакру.", "Stand back, {hero}. That's Kisame, the Tailless Tailed Beast. His sword eats chakra."),
      H("Тогда я не дам ему поесть. Ни одной лишней печати.", "Then I won't let it eat. Not a single wasted seal."),
      A("kurenai", "Я держу его партнёра в иллюзии. Недолго. У тебя минута, {hero}.", "I'm holding his partner in a genjutsu. Not for long. You have a minute, {hero}."),
    ],
    outro: [
      E("Ха… Раньше ты был мальком. Теперь — рыба покрупнее. Мы вернёмся за тобой.", "Heh… You used to be a minnow. Now you're a bigger fish. We'll be back for you."),
      N("Двое ушли в воду так же тихо, как появились.", "The two sank into the water as quietly as they had come."),
      A("asuma", "Они охотятся на джинчурики. Всех. И начали с Песка.", "They hunt the jinchūriki. All of them. And they started with the Sand."),
      N("Через два дня пришла весть: Казекаге похищен.", "Two days later the news came: the Kazekage had been taken."),
    ],
    taunt: T("Твоя чакра пахнет страхом. Вкусно.", "Your chakra smells of fear. Delicious."),
    reply: T("Это не страх. Это огонь.", "That's not fear. That's fire."),
  },
  {
    arc: 1,
    title: T("Спасение Казекаге", "Rescue the Kazekage"),
    brief: T("Догони глиняную птицу, уносящую Казекаге.", "Catch the clay bird carrying away the Kazekage."),
    location: "suna",
    enemy: "deidara",
    hp: 1280,
    unlocks: ["RYUKA"],
    intro: [
      N("Деревня Скрытого Песка. На стенах — следы взрывов. Над пустыней кружит белая глиняная птица.", "The Village Hidden in the Sand. Blast marks on the walls. A white clay bird circles over the desert."),
      A("temari", "Он защищал нас до последнего. Даже когда они его забирали, песок укрывал деревню.", "He protected us to the very end. Even as they took him, the sand kept shielding the village."),
      A("kankuro", "Я пытался их остановить. Их кукловод отравил меня. Второй — взорвал полстены.", "I tried to stop them. Their puppeteer poisoned me. The other blew up half the wall."),
      E("Искусство — это взрыв, мгновение, а не вечность. Сейчас покажу.", "Art is an explosion — a moment, not eternity. Let me show you."),
      H("Верни Гаару. Потом можешь взрывать что угодно. Себя, например.", "Give Gaara back. Then blow up whatever you like. Yourself, for instance."),
      M("{hero}, он держится в воздухе. Пламя дракона бьёт далеко: горит сильнее, но короче Огненного шара.", "{hero}, he stays in the air. Dragon Flame reaches far: it burns hotter but shorter than the Fireball."),
      M("Глина боится огня так же, как бумага — воды. Жги.", "Clay fears fire the way paper fears water. Burn it."),
    ],
    outro: [
      E("Мою птицу… сожгли в воздухе? Это… было почти красиво.", "My bird… burned in mid-air? That was… almost beautiful."),
      N("Глиняный подрывник ушёл в песок, оставив только лужу расплавленной глины.", "The clay bomber slipped away into the sand, leaving only a puddle of melted clay."),
      A("kankuro", "Их логово в скалах. Там второй — Сасори. Кукольник. И он не выпустит Гаару живым.", "Their hideout is in the cliffs. The other one's there — Sasori. The puppeteer. He won't let Gaara out alive."),
      H("Тогда идём сейчас.", "Then we go now."),
    ],
    taunt: T("Искусство! Смотри, как красиво взрывается твоя защита!", "Art! Watch how beautifully your defences explode!"),
    reply: T("А вот этот огонь — моё искусство!", "And this fire is MY art!"),
  },
  {
    arc: 1,
    title: T("Кукловод", "The Puppet Master"),
    brief: T("Войди в логово и не дай яду коснуться тебя.", "Enter the hideout and don't let the poison touch you."),
    location: "hideout",
    enemy: "sasori",
    hp: 1360,
    unlocks: [],
    intro: [
      N("Логово Акацуки. Каменная пещера, холод и запах лекарств, смешанный с ядом.", "The Akatsuki hideout. A stone cave, cold, and the smell of medicine mixed with poison."),
      A("sakura", "Я сделала противоядие. На три часа. Потом — не знаю.", "I made an antidote. It lasts three hours. After that — I don't know."),
      E("Ненавижу ждать и ненавижу, когда ждут меня. Давай быстрее.", "I hate waiting and I hate keeping people waiting. Let's be quick."),
      N("Он выходит из огромной куклы. Его лицо не изменилось за двадцать лет. Оно тоже кукла.", "He steps out of a giant puppet. His face hasn't changed in twenty years. It's a puppet too."),
      E("Люди стареют и гниют. Куклы — вечны. Я сделаю из тебя красивую.", "People age and rot. Puppets are eternal. I'll make a beautiful one out of you."),
      H("Ты сам себя превратил в куклу. Кто теперь дёргает за твои нити?", "You turned yourself into a puppet. Who pulls your strings now?"),
      A("sakura", "{hero}, его сердце — единственное живое. Все остальные части — дерево и сталь.", "{hero}, his heart is the only living part. Everything else is wood and steel."),
    ],
    outro: [
      E("Мама… папа… Я сделал вас из дерева, но вы так и не обняли меня.", "Mother… Father… I made you out of wood, but you never held me."),
      N("Нити оборвались. Кукловод замер между двумя куклами-родителями, как будто наконец дома.", "The strings snapped. The puppeteer went still between his two parent puppets, as if finally home."),
      A("gaara", "…{hero}? Вы пришли. За мной.", "…{hero}? You came. For me."),
      H("Конечно. Друзья так делают.", "Of course. That's what friends do."),
      N("Казекаге вернулся домой. Но Акацуки не останавливались. Следующим стал учитель {hero}.", "The Kazekage came home. But the Akatsuki didn't stop. Next, they came for {hero}'s teacher."),
    ],
    taunt: T("Одна царапина — и через три дня ты станешь частью коллекции.", "One scratch — and in three days you'll join my collection."),
    reply: T("Тогда я просто не дам тебе меня поцарапать!", "Then I just won't let you scratch me!"),
  },
  {
    arc: 1,
    title: T("Бессмертный", "The Immortal"),
    brief: T("Отомсти за павшего учителя в лесу клана Нара.", "Avenge a fallen teacher in the Nara clan forest."),
    location: "narawoods",
    enemy: "hidan",
    hp: 1440,
    unlocks: [],
    intro: [
      N("Лес клана Нара. Здесь пасутся олени, и ни один чужак не знает троп.", "The Nara clan forest. Deer graze here, and no outsider knows the trails."),
      A("shikamaru", "Он убил Асуму-сенсея. Смеялся. Потом молился своему богу.", "He killed Asuma-sensei. Laughed. Then prayed to his god."),
      A("shikamaru", "Я заманю его сюда. Ты бьёшь, когда тень схватит. У меня всё рассчитано. Почти всё.", "I'll lure him here. You strike when the shadow grabs him. I've calculated everything. Almost."),
      E("Ещё одна жертва для моего бога. Молись, мелкий, — это хотя бы весело.", "Another offering for my god. Pray, kid — at least it's fun."),
      H("Я не молюсь. Я складываю печати.", "I don't pray. I form seals."),
      M("{hero}, его не убить обычным ударом. Держи щит под рукой — если техника сорвётся, он ударит в полную силу.", "{hero}, ordinary blows won't kill him. Keep a shield ready — if a jutsu fails, he hits at full strength."),
    ],
    outro: [
      E("Больно… как же это прекрасно больно…", "It hurts… it hurts so beautifully…"),
      A("shikamaru", "Этот лес принадлежит моему клану. Ты останешься в нём навсегда. Под землёй.", "This forest belongs to my clan. You'll stay in it forever. Underground."),
      N("Земля сомкнулась над бессмертным. Шикамару закурил сигарету учителя — и закашлялся.", "The earth closed over the immortal. Shikamaru lit his teacher's cigarette — and coughed."),
      A("shikamaru", "Его напарник ещё жив. Пять сердец. Для него нужна техника посильнее.", "His partner is still alive. Five hearts. We'll need a stronger technique for him."),
    ],
    taunt: T("Больно? Это только начало ритуала!", "Does it hurt? The ritual has only begun!"),
    reply: T("Твой ритуал закончится здесь.", "Your ritual ends here."),
  },
  {
    arc: 1,
    title: T("Пять сердец", "Five Hearts"),
    brief: T("Освой технику ветра и разбей все сердца Какузу.", "Master a wind technique and break every one of Kakuzu's hearts."),
    location: "canyon",
    enemy: "kakuzu",
    hp: 1520,
    unlocks: ["RASENSHURIKEN"],
    intro: [
      N("Каньон. Ветер воет между скал. На валуне сидит человек в маске и пересчитывает деньги.", "A canyon. Wind howls between the rocks. A masked man sits on a boulder, counting money."),
      E("Твоя голова стоит меньше, чем я думал. Но работа есть работа.", "Your head's worth less than I thought. But a job is a job."),
      A("yamato", "Осторожно, {hero}. Он крадёт сердца врагов и живёт уже девяносто лет. У каждого сердца — своя стихия.", "Careful, {hero}. He steals his enemies' hearts and has lived ninety years. Each heart has its own element."),
      M("Я видел, как ты тренировался с тенью-клоном. Расенган плюс ветер. Ты готов?", "I saw you training with the shadow clones. Rasengan plus wind. Are you ready?"),
      H("Готов. Руки дрожат, но готов.", "Ready. My hands are shaking, but I'm ready."),
      M("Расен-сюрикен: пять печатей. Идеально сложенный — отдача не ранит тебя. Ошибёшься — техника ударит и по тебе.", "Rasenshuriken: five seals. Cast perfectly, there's no recoil. Make a mistake and it cuts you too."),
      E("Ветер? Против меня? У меня есть сердце и на этот случай.", "Wind? Against me? I've got a heart for that too."),
    ],
    outro: [
      E("Миллионы микроскопических игл… В каждую клетку… Сколько же это… стоит…", "Millions of microscopic needles… Into every cell… How much is that… worth…"),
      N("Последнее сердце остановилось. Каньон затих, только ветер ещё долго гулял по скалам.", "The last heart stopped. The canyon went quiet, only the wind wandering the rocks for a long while."),
      A("tsunade", "Техника уровня Каге. И она режет того, кто её держит. Больше без идеальной формы не бросай её, понял?", "A Kage-level technique. And it cuts whoever holds it. Don't throw it again without perfect form, understood?"),
      H("Понял. А что с Акацуки?", "Understood. What about the Akatsuki?"),
      A("tsunade", "Разведка видела Итачи Учиху у старого убежища. Его брат идёт туда же.", "Scouts spotted Itachi Uchiha at the old hideout. His brother is heading there too."),
    ],
    taunt: T("У меня ещё четыре сердца. А у тебя?", "I still have four hearts. How many do you have?"),
    reply: T("Одно. Но ему хватит!", "One. And it's enough!"),
  },
  {
    arc: 1,
    title: T("Ночь красной луны", "Night of the Red Moon"),
    brief: T("Встреться с Итачи. Узнай, чего он хочет на самом деле.", "Face Itachi. Learn what he truly wants."),
    location: "konohanight",
    enemy: "itachi",
    hp: 1600,
    unlocks: ["KIRIN"],
    intro: [
      N("Старое убежище Учиха. Над разрушенной башней висит луна цвета крови.", "The old Uchiha hideout. A blood-coloured moon hangs over the ruined tower."),
      N("На троне сидит человек. Вороны садятся ему на плечи, не боясь.", "A man sits on a throne. Crows land on his shoulders without fear."),
      E("Ты пришёл один. Смело. Или глупо.", "You came alone. Brave. Or foolish."),
      H("Зачем ты вырезал свой клан? Твой брат ищет тебя, чтобы убить.", "Why did you wipe out your clan? Your brother is hunting you to kill you."),
      E("Некоторые правды нельзя сказать. Их можно только прожить.", "Some truths can't be told. They can only be lived."),
      M("{hero}, его глаза видят каждую ошибку. Против иллюзий нужна техника, которая приходит с неба.", "{hero}, his eyes see every mistake. Against illusions you need a technique that comes from the sky."),
      M("Кирин: пять печатей. Молния, которую не остановить. Если враг слаб — она добивает с удвоенной силой.", "Kirin: five seals. Lightning that can't be stopped. If the enemy is weakened, it finishes them with double force."),
    ],
    outro: [
      E("Хорошо. Ты не колеблешься. Значит, ему будет у кого учиться.", "Good. You don't hesitate. Then he'll have someone to learn from."),
      N("Итачи улыбнулся — впервые за много лет — и рассыпался стаей воронов.", "Itachi smiled — for the first time in years — and scattered into a flock of crows."),
      H("Он… проверял меня?", "Was he… testing me?"),
      M("Возможно. Но их лидер не станет проверять. Он ждёт в Деревне Скрытого Дождя.", "Perhaps. Their leader won't test you, though. He waits in the Village Hidden in the Rain."),
    ],
    taunt: T("Всё, что ты видишь, — иллюзия.", "Everything you see is an illusion."),
    reply: T("Тогда эта иллюзия сейчас тебя ударит!", "Then this illusion is about to hit you!"),
  },
  {
    arc: 1,
    title: T("Бумажный ангел", "The Paper Angel"),
    brief: T("Проберись в Деревню Дождя мимо стража из бумаги.", "Get into the Rain Village past the paper guardian."),
    location: "rain",
    enemy: "konan",
    hp: 1680,
    unlocks: [],
    intro: [
      N("Деревня Скрытого Дождя. Здесь не бывает солнца, только стальные башни и вечный ливень.", "The Village Hidden in the Rain. There is no sun here, only steel towers and endless rain."),
      A("jiraiya", "Я учил здесь троих сирот. Давно. Один из них теперь зовёт себя богом.", "I taught three orphans here. Long ago. One of them now calls himself a god."),
      E("Уходи. Этот дождь — слёзы нашего бога. Ты не имеешь права мочить в них ноги.", "Leave. This rain is our god's tears. You have no right to walk in it."),
      H("Я пришёл за тем, кто стоит за Акацуки.", "I came for the one behind the Akatsuki."),
      E("Тогда сначала пройди сквозь меня. Тысяча листов бумаги — тысяча лезвий.", "Then first get through me. A thousand sheets of paper — a thousand blades."),
      A("jiraiya", "{hero}, дождь тебе на руку. Водяной дракон бьёт и возвращает чакру — бой будет долгим.", "{hero}, the rain is on your side. The Water Dragon hits AND gives chakra back — this will be a long fight."),
    ],
    outro: [
      E("Мокрая бумага… не режет. Какая глупая ошибка.", "Wet paper… doesn't cut. What a foolish mistake."),
      H("Скажи, где он.", "Tell me where he is."),
      E("Тебе не нужно искать. Он уже идёт к твоей деревне.", "You don't need to look. He is already on his way to your village."),
      N("Когда {hero} вернулся, Коноха лежала в руинах. Над кратером стоял человек с кольцами в глазах.", "When {hero} returned, the Leaf lay in ruins. A man with rings in his eyes stood over the crater."),
    ],
    taunt: T("Бумага бывает острее стали, если её сложить правильно.", "Paper can be sharper than steel if you fold it right."),
    reply: T("А печати — сильнее бумаги, если их сложить правильно!", "And seals are stronger than paper if you fold them right!"),
  },
  {
    arc: 1,
    title: T("Бог дождя", "God of the Rain"),
    brief: T("Коноха разрушена. Останови того, кто называет себя Болью.", "The Leaf is destroyed. Stop the one who calls himself Pain."),
    location: "ruins",
    enemy: "pain",
    hp: 1760,
    unlocks: [],
    intro: [
      N("Одним ударом он стёр Коноху в кратер. Вокруг тишина, пыль и стоны под камнями.", "With a single blow he erased the Leaf into a crater. Around: silence, dust, and moans beneath the stones."),
      E("Почувствуй боль. Осознай боль. Прими боль. Тот, кто не знает боли, не знает мира.", "Feel pain. Understand pain. Accept pain. Those who don't know pain don't know peace."),
      H("Я знаю боль. Ты убил моего учителя. Но мир так не строят.", "I know pain. You killed my teacher. But that's not how peace is built."),
      A("hinata", "{hero}! Я… я не дам ему тебя тронуть! Я всегда смотрела только на тебя!", "{hero}! I… I won't let him touch you! I've always only been watching you!"),
      E("Трогательно. И бесполезно.", "Touching. And useless."),
      N("Хината падает. Что-то внутри {hero} ломается — и что-то становится на место.", "Hinata falls. Something inside {hero} breaks — and something else falls into place."),
      M("{hero}, у него шесть тел, но одна воля. Держись. Не трать чакру на ярость — трать на точность.", "{hero}, he has six bodies but one will. Hold on. Don't spend chakra on rage — spend it on precision."),
    ],
    outro: [
      E("Ты… не сломался. Почему?", "You… didn't break. Why?"),
      H("Потому что мой учитель верил, что однажды люди поймут друг друга. Я докажу, что он был прав.", "Because my teacher believed people would one day understand each other. I'll prove he was right."),
      A("hinata", "…{hero}. Ты жив. Хорошо.", "…{hero}. You're alive. Good."),
      N("Тела Боли упали, как марионетки с оборванными нитями. Нити вели в башню на краю леса.", "Pain's bodies fell like puppets with cut strings. The strings led to a tower at the edge of the woods."),
    ],
    taunt: T("Шинра Тенсей. Всё, что ты любишь, отталкивается от тебя.", "Shinra Tensei. Everything you love is pushed away from you."),
    reply: T("А я притягиваю его обратно!", "And I pull it right back!"),
  },
  {
    arc: 1,
    title: T("Нагато", "Nagato"),
    brief: T("Найди настоящее тело Боли и поговори с ним — кулаками и словами.", "Find Pain's real body and talk to him — with fists and with words."),
    location: "raintower",
    enemy: "nagato",
    hp: 1840,
    unlocks: [],
    intro: [
      N("Бумажная башня в лесу. Внутри — истощённый человек, прикованный к машине. Из его спины торчат стержни.", "A paper tower in the woods. Inside, a wasted man chained to a machine. Rods jut from his back."),
      E("Ты пришёл убить меня? Тогда цикл продолжится. Ненависть рождает ненависть.", "Have you come to kill me? Then the cycle goes on. Hatred breeds hatred."),
      H("Я пришёл прервать его. Я читал книгу нашего учителя. Главный герой там — не сдаётся.", "I've come to break it. I read our teacher's book. Its hero never gives up."),
      E("Джирайя… Он называл эту книгу глупой сказкой.", "Jiraiya… He called that book a silly fairy tale."),
      H("Сказки становятся правдой, когда кто-то верит в них до конца.", "Fairy tales come true when someone believes in them to the very end."),
      E("Тогда покажи мне, насколько глубоко ты веришь.", "Then show me how deep your belief goes."),
    ],
    outro: [
      E("…Я поверю в тебя. Как когда-то Яхико верил в меня.", "…I'll believe in you. The way Yahiko once believed in me."),
      N("Последней техникой Нагато вернул к жизни всех, кого забрал в Конохе. И закрыл глаза.", "With his final technique, Nagato brought back everyone he had taken in the Leaf. And closed his eyes."),
      N("Деревня встречала {hero} на руках. Впервые за много лет никто не смотрел на него как на чужого.", "The village carried {hero} on its shoulders. For the first time in years, no one looked at him as an outsider."),
      M("Праздник будет коротким. Человек в маске объявил войну всем пяти деревням.", "The celebration will be short. The masked man has declared war on all five villages."),
    ],
    taunt: T("Мир без боли невозможен. Я — доказательство.", "A world without pain is impossible. I am the proof."),
    reply: T("А я — доказательство обратного!", "And I'm the proof of the opposite!"),
  },

  // ═══════════════════════════ PART III · THE FOURTH WAR ═══════════════════════════
  {
    arc: 2,
    title: T("Совет пяти Каге", "The Five Kage Summit"),
    brief: T("На совете Каге кто-то похищает чужие глаза. Разоблачи его.", "At the Kage summit, someone is stealing eyes. Expose him."),
    location: "summit",
    enemy: "danzo",
    hp: 1920,
    unlocks: [],
    intro: [
      N("Страна Железа. Самураи охраняют зал, где за одним столом впервые за десятилетия сидят пять Каге.", "The Land of Iron. Samurai guard the hall where, for the first time in decades, five Kage sit at one table."),
      A("raikage", "Акацуки похитили моего брата! Я требую голову каждого, кто им помогал!", "The Akatsuki took my brother! I want the head of everyone who helped them!"),
      A("mei", "Может, начнём с того, кто сидит от имени Конохи? Его правый глаз слишком… внимателен.", "Perhaps we start with the one sitting in for the Leaf? His right eye is a little too… attentive."),
      N("Старик с перевязанной головой медленно поднимается. Под бинтами на его руке — десяток чужих глаз.", "An old man with a bandaged head rises slowly. Under the wrappings on his arm — a dozen stolen eyes."),
      E("Корень не нуждается в свете. Я защищал деревню из тени, пока вы играли в героев.", "The Root has no need for light. I protected the village from the shadows while you played heroes."),
      H("Вы защищали её ценой чужих жизней. Это не защита.", "You protected it at the cost of other people's lives. That's not protection."),
      A("onoki", "Мальчишка прав. Давай, малец. Покажи этим старикам, как дерутся новые времена.", "The kid's right. Go on, boy. Show these old men how the new era fights."),
    ],
    outro: [
      E("Шаринганы… гаснут. Все до одного. Значит, моё время вышло.", "The Sharingan… are going dark. Every one. So my time is up."),
      N("Данзо ушёл в тень навсегда. Каге переглянулись — и впервые заговорили не о мести, а о союзе.", "Danzō stepped into the shadows for good. The Kage looked at each other — and for the first time spoke of alliance, not revenge."),
      A("raikage", "Союз шиноби. Все пять деревень. Против Акацуки и человека в маске.", "A Shinobi Alliance. All five villages. Against the Akatsuki and the masked man."),
      A("gaara", "Я поведу армию. А {hero} — наш самый важный боец. Его надо беречь.", "I'll lead the army. And {hero} is our most important fighter. He must be protected."),
      H("Беречь? Меня? Нет уж. Я пойду впереди.", "Protected? Me? No way. I'm going in front."),
    ],
    taunt: T("Ради деревни я пожертвую кем угодно. Даже тобой.", "For the village I'll sacrifice anyone. Even you."),
    reply: T("А я — никем!", "And I won't sacrifice anyone!"),
  },
  {
    arc: 2,
    title: T("Змеиный мудрец", "The Snake Sage"),
    brief: T("Найди того, кто поднимает мёртвых на войну.", "Find the one raising the dead for the war."),
    location: "lair",
    enemy: "kabuto",
    hp: 2000,
    unlocks: [],
    intro: [
      N("Четвёртая война шиноби началась. На поле боя выходят те, кто давно лежит в земле.", "The Fourth Shinobi War has begun. People long buried are walking onto the battlefield."),
      A("zabuza", "…Опять ты, мальчишка. Не смотри так. Я не хотел просыпаться.", "…You again, kid. Don't look at me like that. I didn't want to wake up."),
      A("haku", "Прости. Наши тела не слушаются. Найди того, кто держит нити.", "I'm sorry. Our bodies won't obey us. Find the one holding the strings."),
      N("Подземное логово. На стенах — змеиная чешуя. Навстречу выходит тот, кого {hero} когда-то победил первым Расенганом.", "An underground lair. Snake scales cover the walls. Out comes the one {hero} once beat with the very first Rasengan."),
      E("Я больше не шпион. Я впитал знания Орочимару, силу его клеток и мудрость змей. Я — совершенство.", "I'm no spy anymore. I've absorbed Orochimaru's knowledge, his cells and the wisdom of snakes. I am perfection."),
      H("Ты просто всё время хочешь быть кем-то другим.", "You just keep wanting to be someone else."),
      M("{hero}, пока он держит технику воскрешения, наши павшие сражаются против нас. Каждая секунда стоит жизней.", "{hero}, as long as he holds the reanimation, our fallen fight against us. Every second costs lives."),
    ],
    outro: [
      E("Кто я… на самом деле? Я не помню своего лица…", "Who am I… really? I don't remember my own face…"),
      A("zabuza", "Нити ослабли. Хаку, пора обратно. Спасибо, малёк. Второй раз проигрываю тебе — и не обидно.", "The strings are slack. Haku, time to go back. Thanks, kid. Second time I've lost to you — and I don't mind."),
      A("haku", "Будь сильным. Ради тех, кого любишь.", "Be strong. For the ones you love."),
      N("Души павших поднялись в небо. А на поле боя вышел человек в оранжевой маске.", "The souls of the fallen rose into the sky. And onto the battlefield walked a man in an orange mask."),
    ],
    taunt: T("Мои змеи видят тепло твоей крови. Прятаться бессмысленно.", "My snakes see the warmth of your blood. Hiding is pointless."),
    reply: T("А я и не прячусь!", "Who said I'm hiding?"),
  },
  {
    arc: 2,
    title: T("Человек в маске", "The Masked Man"),
    brief: T("Сорви маску с того, кто начал войну.", "Tear the mask off the one who started the war."),
    location: "battlefield",
    enemy: "obito",
    hp: 2080,
    unlocks: [],
    intro: [
      N("Поле Четвёртой войны. Тысячи шиноби пяти деревень стоят плечом к плечу.", "The Fourth War battlefield. Thousands of shinobi from five villages stand shoulder to shoulder."),
      A("might-guy", "Вперёд, молодость! {hero}, за моей спиной — только победа!", "Onward, youth! {hero}, behind my back there's nothing but victory!"),
      E("Этот мир — ад. Я создам новый, где никто не умирает и никто не одинок.", "This world is hell. I'll create a new one where no one dies and no one is alone."),
      H("Мир, где никто ничего не выбирает, — это тюрьма.", "A world where no one chooses anything is a prison."),
      A("kakashi", "{hero}… Я знаю эту технику. Этот голос. Это невозможно.", "{hero}… I know that technique. That voice. It's impossible."),
      M("Удары проходят сквозь него. Бей в момент, когда он сам атакует — только тогда он материален.", "Strikes pass straight through him. Hit him the instant he attacks — only then is he solid."),
    ],
    outro: [
      N("Маска треснула. Под ней — лицо, наполовину покрытое шрамами. Какаши опустил кунай.", "The mask cracked. Beneath it — a face half-covered in scars. Kakashi lowered his kunai."),
      A("kakashi", "Обито. Ты же… погиб. Я носил твой глаз пятнадцать лет.", "Obito. You… died. I've carried your eye for fifteen years."),
      E("Тот Обито погиб. Остался только тот, кто видел, как умерла Рин.", "That Obito died. All that's left is the one who watched Rin die."),
      N("Земля дрогнула. Из-за горизонта шёл второй воскрешённый — легенда, которую боялись даже Каге.", "The ground shook. Over the horizon came a second reanimated man — a legend even the Kage feared."),
    ],
    taunt: T("Ты никогда не поймаешь то, чего нет.", "You'll never catch what isn't there."),
    reply: T("Тогда я поймаю тебя, когда ты станешь настоящим!", "Then I'll catch you the moment you're real!"),
  },
  {
    arc: 2,
    title: T("Призрак Учиха", "Ghost of the Uchiha"),
    brief: T("Выстой против легенды, которая одна сражалась с армиями.", "Stand against a legend who fought whole armies alone."),
    location: "desert",
    enemy: "madara",
    hp: 2180,
    unlocks: [],
    intro: [
      N("Пустыня союзных сил. На дюне стоит человек в красных доспехах. Перед ним — пять Каге.", "The Allied Forces desert. A man in red armour stands on a dune. Before him — five Kage."),
      E("Пять Каге… И это всё, что осталось от моего мира? Я разочарован.", "Five Kage… Is this all that's left of my world? How disappointing."),
      A("onoki", "Он обрушил на нас метеорит. Два. Я… не удержал второй.", "He dropped a meteorite on us. Two. I… couldn't hold the second."),
      A("tsunade", "{hero}, мы задержим его сколько сможем. Ты — единственный, кто успевает за его ритмом.", "{hero}, we'll hold him as long as we can. You're the only one who can keep up with his rhythm."),
      H("Я не легенда. Но я ученик десятка легенд.", "I'm not a legend. But I'm the student of a dozen of them."),
      E("Хорошие слова. Танцуй, мальчик. Посмотрим, долго ли.", "Fine words. Dance, boy. Let's see how long."),
      M("Он не ошибается, {hero}. Значит, и ты не имеешь права. Чистые техники — или никаких.", "He makes no mistakes, {hero}. So you can't afford any either. Clean techniques — or none at all."),
    ],
    outro: [
      E("Ха-ха-ха! Давно мне не было так весело!", "Ha-ha-ha! I haven't had this much fun in ages!"),
      N("Он не упал. Он просто взмыл в небо, где уже поднималась луна — багровая и неправильная.", "He didn't fall. He simply rose into the sky, where a moon was already rising — crimson and wrong."),
      A("tsunade", "Он тянет время. Обито становится джинчурики Десятихвостого. Бегите к нему, все!", "He's stalling. Obito is becoming the Ten-Tails' jinchūriki. Everyone, run to him!"),
    ],
    taunt: T("Ты танцуешь неплохо. Но мелодию выбираю я.", "You dance well enough. But I choose the music."),
    reply: T("Тогда я сменю пластинку!", "Then I'll change the record!"),
  },
  {
    arc: 2,
    title: T("Красное небо", "Red Sky"),
    brief: T("Бог в теле человека. Дотянись до того, кто внутри.", "A god in a human body. Reach the person still inside."),
    location: "redmoon",
    enemy: "obito-six-paths",
    hp: 2260,
    unlocks: [],
    intro: [
      N("Небо окрасилось в красный. Из пепла поднимается фигура, белая как кость, с посохом в руке.", "The sky has turned red. From the ashes rises a figure, white as bone, a staff in hand."),
      E("Я — Джинчурики Десятихвостого. Я — Мудрец Шести Путей нового мира.", "I am the Ten-Tails' jinchūriki. I am the Sage of Six Paths of a new world."),
      H("Ты — Обито. Ты хотел стать Хокаге. Я помню, как Какаши рассказывал про тебя.", "You're Obito. You wanted to be Hokage. I remember Kakashi telling me about you."),
      E("Не называй меня этим именем!", "Don't call me by that name!"),
      A("sakura", "{hero}, я держу барьер над армией. Минута. Потом он прожжёт всех.", "{hero}, I'm holding the barrier over the army. One minute. After that he'll burn through everyone."),
      A("kakashi", "Он уже не человек, {hero}. Но внутри ещё есть мальчик, который опаздывал на тренировки. Бей — и говори с ним.", "He's not human anymore, {hero}. But inside is still the boy who was always late to training. Strike — and talk to him."),
    ],
    outro: [
      E("…Я опять опоздал. На целую жизнь.", "…I'm late again. By a whole lifetime."),
      A("kakashi", "Ты вернулся, Обито. Для меня этого достаточно.", "You came back, Obito. That's enough for me."),
      N("Десятихвостый вырвался из него. Мадара поглотил зверя — и луна над миром вспыхнула.", "The Ten-Tails was torn out of him. Madara absorbed the beast — and the moon above the world blazed."),
      N("Все, кто смотрел в небо, заснули. Кроме тех, кого прикрыли друзья.", "Everyone who looked at the sky fell asleep. Except those whose friends shielded them."),
    ],
    taunt: T("Твои печати — это прах. Я создаю миры.", "Your seals are dust. I create worlds."),
    reply: T("А я их спасаю!", "And I save them!"),
  },
  {
    arc: 2,
    title: T("Бесконечное Цукуёми", "Infinite Tsukuyomi"),
    brief: T("Весь мир спит. Разбуди его, победив праматерь чакры.", "The whole world is asleep. Wake it by defeating the mother of chakra."),
    location: "tsukuyomi",
    enemy: "kaguya",
    hp: 2360,
    unlocks: [],
    intro: [
      N("Весь мир висит в коконах на корнях огромного древа. Люди улыбаются во сне.", "The whole world hangs in cocoons on the roots of a giant tree. People smile in their sleep."),
      N("Над древом стоит женщина с рогами и белыми волосами до земли. Мадара стал лишь её сосудом.", "Above the tree stands a woman with horns and white hair reaching the ground. Madara was only her vessel."),
      E("Чакра принадлежит мне. Вы лишь украли её. Я пришла забрать своё.", "Chakra belongs to me. You merely stole it. I have come to take back what's mine."),
      H("Мы не украли. Мы научились делиться ей.", "We didn't steal it. We learned how to share it."),
      A("sasuke", "Не отставай, {hero}. Я открою порталы. Ты бьёшь.", "Keep up, {hero}. I'll open the portals. You strike."),
      A("sakura", "А я — прикрою вас обоих. Как в старые времена. Команда семь.", "And I'll cover you both. Like old times. Team Seven."),
      M("Она прыгает между мирами, {hero}. Бей быстро и чисто: у тебя будет лишь мгновение.", "She jumps between worlds, {hero}. Strike fast and clean: you'll get only an instant."),
    ],
    outro: [
      E("Дети мои… Почему вы всегда восстаёте против матери?", "My children… Why do you always rise against your mother?"),
      N("Праматерь чакры запечатана. Коконы лопаются один за другим. Мир просыпается — и не помнит сна.", "The mother of chakra is sealed. The cocoons burst one by one. The world wakes — and doesn't remember the dream."),
      A("sasuke", "Мир спасён. Теперь у нас с тобой одно незаконченное дело.", "The world is saved. Now you and I have one piece of unfinished business."),
      H("…Долина?", "…The valley?"),
      A("sasuke", "Долина.", "The valley."),
    ],
    taunt: T("Вы все — лишь капли моей чакры. Вернитесь в океан.", "You are all just drops of my chakra. Return to the ocean."),
    reply: T("Эти капли стали рекой. И она течёт против тебя!", "Those drops became a river. And it flows against you!"),
  },
  {
    arc: 2,
    title: T("Эхо Индры", "Echo of Indra"),
    brief: T("Древняя вражда братьев просыпается в Долине. Закончи её.", "An ancient feud between brothers wakes in the Valley. End it."),
    location: "valley",
    enemy: "indra",
    hp: 2440,
    unlocks: [],
    intro: [
      N("Долина Завершения. Та же вода. Те же статуи. Только теперь обе лежат в обломках.", "The Valley of the End. The same water. The same statues. Only now both lie in ruins."),
      N("Над водопадом проступает силуэт в белых одеждах — сын Мудреца Шести Путей, умерший тысячу лет назад.", "Above the falls a silhouette in white robes appears — a son of the Sage of Six Paths, dead for a thousand years."),
      E("Мой брат думал, что сила — в других людях. Я знал: сила — только в себе. Тысячу лет мы доказываем это.", "My brother thought strength lay in other people. I knew strength lies only in oneself. For a thousand years we've been proving it."),
      H("Тысяча лет — и никто не выиграл. Может, дело не в том, кто прав?", "A thousand years and nobody won. Maybe it's not about who's right?"),
      E("Тогда в чём?", "Then what is it about?"),
      H("В том, чтобы хоть раз протянуть руку, а не кулак.", "About offering a hand, just once, instead of a fist."),
      A("sasuke", "Он во мне. Всю жизнь. Я сдержу его сколько смогу — ты бей по нему, не по мне.", "He's inside me. All my life. I'll hold him back as long as I can — hit him, not me."),
    ],
    outro: [
      E("Протянутая рука… Асура говорил то же самое.", "An outstretched hand… Ashura said the same thing."),
      N("Силуэт растаял над водой. Двое сидели на камнях без сил, с одной рукой на двоих — и смеялись.", "The silhouette melted over the water. Two of them sat on the rocks, exhausted, one arm between them — and laughed."),
      A("sasuke", "Ты победил. Опять.", "You win. Again."),
      H("Не я. Мы.", "Not me. Us."),
      N("Так закончилась Четвёртая война шиноби. Мир прожил пятнадцать спокойных лет.", "So ended the Fourth Shinobi War. The world lived fifteen peaceful years."),
    ],
    taunt: T("Тысячу лет я сражаюсь один. Ты — лишь следующий.", "For a thousand years I've fought alone. You're just the next one."),
    reply: T("Именно поэтому ты проигрываешь!", "That's exactly why you keep losing!"),
  },

  // ═══════════════════════════ PART IV · THE NEXT GENERATION ═══════════════════════════
  {
    arc: 3,
    title: T("Пришелец с Луны", "The Visitor from the Moon"),
    brief: T("Экзамен на чунина прерван. С неба пришли пожиратели чакры.", "The Chūnin Exam is interrupted. Chakra-eaters have come from the sky."),
    location: "moon",
    enemy: "momoshiki",
    hp: 2380,
    unlocks: [],
    intro: [
      N("Пятнадцать лет спустя. Новое поколение сдаёт экзамен на чунина — на той же арене.", "Fifteen years later. A new generation takes the Chūnin Exam — in the same arena."),
      A("boruto", "Эй, {hero}! Ты правда тот самый? Отец говорит, ты складываешь печати быстрее всех.", "Hey, {hero}! Are you really the one? Dad says you form seals faster than anyone."),
      A("sarada", "Не приставай. Он наш сенсей на сегодня. Сенсей, объясните ему, что точность важнее понтов.", "Stop pestering him. He's our sensei today. Sensei, explain to him that precision beats showing off."),
      N("Небо раскалывается. С него спускаются двое в белом. Арена исчезает в свете.", "The sky splits open. Two figures in white descend. The arena vanishes in light."),
      E("Мы пришли собрать плод. Эта планета созрела. Её чакра — наша.", "We have come to harvest the fruit. This planet is ripe. Its chakra is ours."),
      H("Плод занят. Ищите другой сад.", "This fruit's taken. Find another orchard."),
      E("Твои техники станут моими, когда я их поглощу. Бей. Мне даже интересно.", "Your techniques will be mine once I absorb them. Strike. I'm almost curious."),
      A("boruto", "Он ест чакру! Сенсей, не бейте одним и тем же дважды — он учится!", "He eats chakra! Sensei, don't use the same move twice — he's learning!"),
    ],
    outro: [
      E("Смертные… Вы проросли глубже, чем я думал. Но корни можно вырвать.", "Mortals… You've taken root deeper than I thought. But roots can be torn out."),
      N("Пришелец рассыпался пылью. На ладони Боруто вспыхнула странная метка — и погасла.", "The visitor crumbled into dust. A strange mark flared on Boruto's palm — and faded."),
      A("boruto", "Что это? Жжёт.", "What's this? It burns."),
      M("Не знаю, {hero}. Но я видел такую же. У мальчика, который недавно появился у ворот деревни.", "I don't know, {hero}. But I've seen one like it. On a boy who recently showed up at the village gates."),
    ],
    taunt: T("Каждая твоя техника делает меня сильнее. Продолжай.", "Every technique you use makes me stronger. Keep going."),
    reply: T("Тогда получай ту, которую ты ещё не видел!", "Then take one you've never seen!"),
  },
  {
    arc: 3,
    title: T("Мальчик с меткой", "The Marked Boy"),
    brief: T("Сосуд Оцуцуки теряет контроль. Останови его, не убивая.", "An Ōtsutsuki vessel is losing control. Stop him without killing him."),
    location: "villagenight",
    enemy: "kawaki",
    hp: 2460,
    unlocks: [],
    intro: [
      N("Ночная Коноха. Фонари, дождь и мальчик с чёрными линиями на лице, который не умеет доверять.", "The Leaf at night. Lanterns, rain, and a boy with black lines on his face who doesn't know how to trust."),
      E("Вы все одинаковые. Сначала кормите, потом используете. Как Кара.", "You're all the same. First you feed me, then you use me. Just like Kara."),
      H("Никто тебя не использует. Ты можешь уйти, куда хочешь. Но разрушать город я не дам.", "Nobody's using you. You can go wherever you want. But I won't let you tear this city apart."),
      A("boruto", "Каваки, придурок! Я тебе вчера рамен отдал! Это что, использование?!", "Kawaki, you idiot! I gave you my ramen yesterday! Is that 'using' you?!"),
      E("…Заткнись.", "…Shut up."),
      M("Он дерётся от страха, {hero}. Покажи, что печати — это не только оружие.", "He fights out of fear, {hero}. Show him seals aren't only a weapon."),
    ],
    outro: [
      E("…Почему ты не добил меня?", "…Why didn't you finish me?"),
      H("Потому что ты тоже можешь выбрать другой путь. Я знал одного — он выбирал его пятнадцать лет.", "Because you can choose another path too. I knew someone who took fifteen years to choose it."),
      A("boruto", "Пошли есть рамен. Нормальный, без драки.", "Let's go eat ramen. Normal ramen, no fighting."),
      N("Метка на его ладони вспыхнула. Кто-то очень древний почувствовал это — и открыл глаза.", "The mark on his palm flared. Someone very old felt it — and opened his eyes."),
    ],
    taunt: T("Эта сила сожрёт и тебя.", "This power will devour you too."),
    reply: T("Моя сила — не метка. Мои руки.", "My power isn't a mark. It's my hands."),
  },
  {
    arc: 3,
    title: T("Оцуцуки", "The Ōtsutsuki"),
    brief: T("Последний бой. Всё, чему ты научился, — против бога.", "The final battle. Everything you've learned — against a god."),
    location: "crater",
    enemy: "isshiki",
    hp: 2600,
    unlocks: [],
    intro: [
      N("С неба спустился Оцуцуки, веками путешествовавший между мирами.", "An Ōtsutsuki who had travelled between worlds for centuries descended from the sky."),
      E("Вы — всего лишь насекомые, которые научились складывать пальцы.", "You are mere insects that have learned to fold their fingers."),
      H("Эти «насекомые» уже побеждали богов. Дважды.", "These 'insects' have beaten gods before. Twice."),
      A("kawaki", "Я с тобой. Он создал меня сосудом. Я сам решу, чем быть.", "I'm with you. He made me to be a vessel. I'll decide for myself what I am."),
      A("boruto", "И я! Команда семь нового поколения — на позиции!", "Me too! The new Team Seven — in position!"),
      A("iruka", "Ты сдавал у меня экзамен, помнишь? Ни одной лишней печати, {hero}. Как тогда.", "You took your exam with me, remember? Not a single wasted seal, {hero}. Just like back then."),
      E("Тогда я раздавлю вас медленно. Одну печать за другой.", "Then I'll crush you slowly. One seal at a time."),
      M("Весь путь, что ты прошёл, {hero}, — ради этого боя. Выбери три лучшие техники. Ошибок здесь не прощают.", "Everything you've been through, {hero}, was for this fight. Choose your three best techniques. Mistakes are not forgiven here."),
    ],
    outro: [
      E("Невозможно… Меня одолели смертные?", "Impossible… Bested by mortals?"),
      H("Мы учимся друг у друга. В этом наша сила.", "We learn from each other. That's our strength."),
      A("kawaki", "…Спасибо. Я, кажется, понял, как это — быть не сосудом.", "…Thank you. I think I get it now — what it's like not to be a vessel."),
      M("Ты больше не мой ученик, {hero}. Ты — тот, у кого будут учиться.", "You're not my student anymore, {hero}. You're the one others will learn from."),
      A("iruka", "Протектор, который я тебе отдал… Отдай его однажды кому-нибудь тоже. Так это работает.", "That headband I gave you… Pass it on to someone someday too. That's how it works."),
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

/**
 * The lines actually played for a player: ally lines spoken by the player's own
 * character or by the chapter's enemy are skipped (they'd be talking to themselves).
 */
export function linesFor(ch: Chapter, part: "intro" | "outro", hero: CharacterId | null, enemy: CharacterId | null): Line[] {
  return ch[part].filter((l) => l.speaker !== "ally" || (l.who !== hero && l.who !== enemy));
}
