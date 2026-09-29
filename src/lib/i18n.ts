/**
 * Tiny i18n: Russian + English. A module-level store (so non-React code such
 * as GameSession can localise too) plus `useLang()` for React re-renders.
 */
import type { L, Lang } from "@/types/i18n";

const LS_KEY = "shinobi.lang";
let current: Lang = "ru";
const subs = new Set<() => void>();

export const getLang = () => current;

export function setLang(l: Lang) {
  current = l;
  try {
    localStorage.setItem(LS_KEY, l);
  } catch {
    /* storage unavailable */
  }
  if (typeof document !== "undefined") document.documentElement.lang = l;
  subs.forEach((f) => f());
}

/** Load the saved language (call once on the client). */
export function initLang() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved === "ru" || saved === "en") return setLang(saved);
  } catch {
    /* ignore */
  }
  setLang(typeof navigator !== "undefined" && !navigator.language.toLowerCase().startsWith("ru") && !navigator.language.toLowerCase().startsWith("kk") ? "en" : "ru");
}

export const subscribeLang = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

/** Pick the current language from a bilingual string. */
export function tr(l: L | string, params?: Record<string, string | number>): string {
  let s = typeof l === "string" ? l : l[current];
  if (params) for (const [k, v] of Object.entries(params)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export const STR = {
  // start
  eyebrow: { ru: "БИТВА ПЕЧАТЕЙ ПЕРЕД ВЕБКАМЕРОЙ", en: "A WEBCAM HAND-SIGN BATTLE" },
  tagline: { ru: "ТВОИ РУКИ — ЭТО КОНТРОЛЛЕР", en: "YOUR HANDS ARE THE CONTROLLER" },
  cta: { ru: "НАЧАТЬ ИСПЫТАНИЕ ШИНОБИ", en: "ENTER THE SHINOBI TRIAL" },
  step1: { ru: "Покажи обе руки камере", en: "Show both hands to the camera" },
  step2: { ru: "Складывай печати по порядку", en: "Form the seals in order" },
  step3: { ru: "Применяй техники и побеждай злодеев", en: "Cast jutsu, defeat the villains" },
  foot: {
    ru: "Работает прямо в браузере · видео не покидает устройство · лучше всего с веб-камерой ноутбука и хорошим светом",
    en: "Runs entirely in your browser · camera frames never leave your device · best with a laptop webcam and good light",
  },
  twelveSeals: { ru: "12 ПЕЧАТЕЙ ЗОДИАКА", en: "THE 12 ZODIAC SEALS" },

  // camera
  loading: { ru: "Призываем камеру…", en: "Summoning the camera…" },
  loadingSub: { ru: "Разреши доступ к камере, когда браузер спросит. Видео не покидает устройство.", en: "Allow camera access when your browser asks. Video never leaves your device." },
  err_denied: { ru: "Чтобы стать шиноби, нужен доступ к камере.", en: "Camera access is required to become a shinobi." },
  err_unavailable: { ru: "Камера не найдена. Проверь разрешения браузера.", en: "Camera not detected. Check your browser permissions." },
  err_insecure: { ru: "Камера работает только по HTTPS (или на localhost).", en: "The camera only works over HTTPS (or on localhost)." },
  err_model: { ru: "Не удалось загрузить модель рук. Проверь интернет и попробуй снова.", en: "Could not load the hand-tracking model. Check your connection and try again." },
  err_unknown: { ru: "Не получилось запустить камеру.", en: "Something went wrong while starting the camera." },
  errSubDenied: { ru: "Нажми на значок камеры в адресной строке, разреши доступ и попробуй снова.", en: "Click the camera icon in your browser's address bar, allow access, then try again." },
  errSubOther: { ru: "Закрой другие приложения, которые используют камеру, и попробуй снова.", en: "Close other apps using the camera, then try again." },
  tryAgain: { ru: "ПОПРОБОВАТЬ СНОВА", en: "TRY AGAIN" },
  cameraCheck: { ru: "ПРОВЕРКА КАМЕРЫ", en: "CAMERA CHECK" },
  holdStill: { ru: "Не двигайся…", en: "Hold still…" },
  placeHands: { ru: "Помести обе руки в кадр.", en: "Place both hands inside the frame." },
  showBoth: { ru: "Покажи обе руки.", en: "Show both hands." },
  moveCloser: { ru: "Подойди ближе к камере.", en: "Move closer to the camera." },
  shinobiDetected: { ru: "ШИНОБИ ОБНАРУЖЕН", en: "SHINOBI DETECTED" },
  syntheticTag: { ru: "DEV · СИНТЕТИЧЕСКИЙ ВВОД (клавиши 1–=)", en: "DEV · SYNTHETIC INPUT (keys 1–=)" },

  // HUD
  round: { ru: "РАУНД", en: "ROUND" },
  score: { ru: "ОЧКИ", en: "SCORE" },
  combo: { ru: "КОМБО", en: "COMBO" },
  backTitle: { ru: "В главное меню", en: "Back to title" },
  debugTitle: { ru: "Отладка зрения (D)", en: "Vision debug overlay (D)" },
  mute: { ru: "Выключить звук (M)", en: "Mute (M)" },
  unmute: { ru: "Включить звук (M)", en: "Unmute (M)" },
  musicTitle: { ru: "Музыка вкл/выкл", en: "Music on/off" },
  musicOn: { ru: "♪ Музыка включена", en: "♪ Music on" },
  musicOff: { ru: "♪ Музыка выключена — нажми ♪, чтобы вернуть", en: "♪ Music off — press ♪ to bring it back" },
  detected: { ru: "РАСПОЗНАНО", en: "DETECTED" },
  noHands: { ru: "НЕТ РУК", en: "NO HANDS" },
  noSeal: { ru: "НЕТ ПЕЧАТИ", en: "NO SEAL" },
  adjust: { ru: "ПОПРАВЬ", en: "ADJUST" },
  incorrect: { ru: "НЕВЕРНО — ЭТО {sign}", en: "INCORRECT — THAT'S {sign}" },
  sideNote: { ru: "Покажи обе руки камере, чтобы начать испытание.", en: "Show both hands to the camera to begin the trial." },

  // mode select
  chooseMode: { ru: "ВЫБЕРИ РЕЖИМ", en: "CHOOSE A MODE" },
  storyTitle: { ru: "ИСТОРИЯ", en: "STORY" },
  storyDesc: { ru: "13 глав в 4 частях, 12 противников, 23 локации. Диалоги, наставник и новые техники по ходу истории.", en: "13 chapters in 4 arcs, 12 opponents, 23 locations. Dialogue, a mentor and new jutsu along the way." },
  quickTitle: { ru: "БЫСТРЫЙ БОЙ", en: "QUICK BATTLE" },
  quickDesc: { ru: "Все техники сразу, один злодей, результат за 2 минуты. Идеально для демо.", en: "Every jutsu unlocked, one villain, a result in 2 minutes. Perfect for a demo." },

  // character select
  step1Label: { ru: "ШАГ 1", en: "STEP 1" },
  chooseShinobi: { ru: "ВЫБЕРИ ШИНОБИ", en: "CHOOSE YOUR SHINOBI" },
  rogue: { ru: "ОТСТУПНИК", en: "ROGUE" },
  vs: { ru: "ПРОТИВ", en: "VS" },

  // chapter select
  chapters: { ru: "ГЛАВЫ", en: "CHAPTERS" },
  chapterN: { ru: "ГЛАВА {n}", en: "CHAPTER {n}" },
  locked: { ru: "Закрыто — пройди предыдущую главу", en: "Locked — clear the previous chapter" },
  cleared: { ru: "ПРОЙДЕНО", en: "CLEARED" },
  newJutsu: { ru: "Новая техника: {name}", en: "New jutsu: {name}" },
  enemyHp: { ru: "Здоровье врага: {hp}", en: "Enemy HP: {hp}" },
  backToMenu: { ru: "← В МЕНЮ", en: "← MENU" },
  changeShinobi: { ru: "← СМЕНИТЬ ШИНОБИ", en: "← CHANGE SHINOBI" },
  resetProgress: { ru: "Сбросить прогресс", en: "Reset progress" },

  // dialogue
  skip: { ru: "ПРОПУСТИТЬ ▸▸", en: "SKIP ▸▸" },
  continueHint: { ru: "Enter / пробел / клик — дальше", en: "Enter / Space / click — continue" },
  narrator: { ru: "Рассказчик", en: "Narrator" },

  // jutsu select
  chooseJutsu: { ru: "ВЫБЕРИ ТЕХНИКУ", en: "CHOOSE YOUR JUTSU" },
  jutsuTip: {
    ru: "Сложи все печати до конца таймера. Без ошибок = ИДЕАЛЬНАЯ ТЕХНИКА (+25% урона).",
    en: "Perform every seal before the timer runs out. No mistakes = PERFECT JUTSU (+25% damage).",
  },
  dmg: { ru: "УРОН", en: "DMG" },
  sec: { ru: "с", en: "s" },
  seals: { ru: "печ.", en: "seals" },
  sealOf: { ru: "ПЕЧАТЬ {i} / {n}", en: "SEAL {i} / {n}" },

  // cast / rounds
  jutsuCast: { ru: "ТЕХНИКА!", en: "JUTSU CAST!" },
  perfectJutsu: { ru: "ИДЕАЛЬНАЯ ТЕХНИКА · +{n}", en: "PERFECT JUTSU · +{n}" },
  speedBonus: { ru: "БОНУС ЗА СКОРОСТЬ +{n}", en: "SPEED BONUS +{n}" },
  perfect: { ru: "ИДЕАЛЬНО", en: "PERFECT" },

  // failed
  jutsuFailed: { ru: "ТЕХНИКА СОРВАНА", en: "JUTSU FAILED" },
  failedSub: { ru: "Время вышло раньше, чем печати были сложены. Комбо сброшено.", en: "Time ran out before the seals were complete. Your combo is broken." },
  retry: { ru: "ЕЩЁ РАЗ", en: "RETRY" },
  chooseAnother: { ru: "СЛЕДУЮЩАЯ ТЕХНИКА ▸", en: "NEXT JUTSU ▸" },

  // results
  victory: { ru: "ПОБЕДА", en: "VICTORY" },
  defeatedBy: { ru: "{foe} повержен. Победитель — {hero}.", en: "{foe} has been defeated by {hero}." },
  rankS: { ru: "ЛЕГЕНДАРНЫЙ ШИНОБИ", en: "LEGENDARY SHINOBI" },
  rankA: { ru: "ЭЛИТНЫЙ ДЖОНИН", en: "ELITE JŌNIN" },
  rankB: { ru: "ЧУНИН", en: "CHŪNIN" },
  rankC: { ru: "ГЕНИН — ТРЕНИРУЙСЯ", en: "GENIN — KEEP TRAINING" },
  pts: { ru: "очк.", en: "pts" },
  rowScore: { ru: "ОЧКИ", en: "SCORE" },
  rowAccuracy: { ru: "ТОЧНОСТЬ", en: "ACCURACY" },
  rowMaxCombo: { ru: "МАКС. КОМБО", en: "MAX COMBO" },
  rowSealTime: { ru: "ВРЕМЯ ПЕЧАТЕЙ", en: "SEAL TIME" },
  rowCast: { ru: "ТЕХНИК", en: "JUTSU CAST" },
  rowMistakes: { ru: "ОШИБКИ", en: "MISTAKES" },
  perfectCount: { ru: "{n} идеальн.", en: "{n} perfect" },
  fightAgain: { ru: "СРАЗИТЬСЯ СНОВА", en: "FIGHT AGAIN" },
  exit: { ru: "ВЫХОД", en: "EXIT" },
  continueStory: { ru: "ПРОДОЛЖИТЬ ИСТОРИЮ ▸", en: "CONTINUE STORY ▸" },
  theEnd: { ru: "ИСТОРИЯ ПРОЙДЕНА", en: "STORY COMPLETE" },
  shadowOf: { ru: "Тень: {name}", en: "Shadow {name}" },
  // v5: player HP, defeat, dojo, records
  yourHp: { ru: "ТВОЯ ЧАКРА", en: "YOUR CHAKRA" },
  enemyStrikes: { ru: "{foe} контратакует: −{n}", en: "{foe} strikes back: −{n}" },
  hpLeft: { ru: "Чакры осталось: {hp} / {max}", en: "Chakra left: {hp} / {max}" },
  defeat: { ru: "ПОРАЖЕНИЕ", en: "DEFEAT" },
  defeatSub: { ru: "{foe} оказался сильнее. Чакра иссякла — но настоящий шиноби встаёт снова.", en: "{foe} was stronger this time. Your chakra ran dry — but a true shinobi gets back up." },
  defeatTip: { ru: "Совет: потренируй сложные печати в Додзё — там нет таймера.", en: "Tip: practise the tricky seals in the Dojo — no timer there." },
  tryFightAgain: { ru: "РЕВАНШ", en: "REMATCH" },
  toChapters: { ru: "К ГЛАВАМ", en: "CHAPTERS" },
  toMenu: { ru: "В МЕНЮ", en: "MENU" },
  dojoTitle: { ru: "ДОДЗЁ", en: "DOJO" },
  dojoDesc: { ru: "Тренировка всех 24 печатей без таймера и урона. Живые подсказки, как исправить руки.", en: "Practise all 24 seals with no timer or damage. Live coaching on fixing your hands." },
  dojoHeader: { ru: "ДОДЗЁ · ТРЕНИРОВКА ПЕЧАТЕЙ", en: "DOJO · SEAL TRAINING" },
  dojoHint: { ru: "Сложи печать и удерживай, затем разожми руки и повтори. {n} раза подряд — печать освоена.", en: "Form the seal and hold it, then release and repeat. {n} in a row masters it." },
  dojoStreak: { ru: "Серия: {s} / {n}", en: "Streak: {s} / {n}" },
  dojoMastered: { ru: "Освоено: {m} / {n}", en: "Mastered: {m} / {n}" },
  dojoDone: { ru: "ПЕЧАТЬ ОСВОЕНА!", en: "SEAL MASTERED!" },
  dojoExit: { ru: "ЗАКОНЧИТЬ ТРЕНИРОВКУ", en: "LEAVE THE DOJO" },
  newRecord: { ru: "НОВЫЙ РЕКОРД!", en: "NEW RECORD!" },
  bestScore: { ru: "Рекорд: {n}", en: "Best: {n}" },
  senseiReview: { ru: "РАЗБОР БОЯ · {name}", en: "DEBRIEF · {name}" },
  senseiThinking: { ru: "Сенсей разбирает твой бой", en: "Your sensei is reviewing the fight" },
  askSensei: { ru: "СОВЕТ СЕНСЕЯ", en: "ASK THE SENSEI" },
  senseiBusy: { ru: "Сенсей думает…", en: "Sensei is thinking…" },
  senseiOffline: { ru: "Сенсей сейчас медитирует (ИИ недоступен). Следи за подсказками на камере — они точные.", en: "The sensei is meditating (AI unavailable). Follow the on-camera hints — they're precise." },
  rowHpLeft: { ru: "ЧАКРА", en: "CHAKRA LEFT" },
  // v8: loadout, effects, harder fights
  loadoutTitle: { ru: "ВЫБЕРИ 3 ТЕХНИКИ НА БОЙ", en: "PICK 3 JUTSU FOR THIS FIGHT" },
  loadoutTitleN: { ru: "ВЫБЕРИ {n} ТЕХНИКИ НА БОЙ", en: "PICK {n} JUTSU FOR THIS FIGHT" },
  loadoutTip: {
    ru: "Между раундами выбирать не нужно: техники идут по кругу 1 → 2 → 3. Во время отсчёта можно переключиться клавишами 1–3 или кликом. Ошибка = −чакра и −1.5 с, идеальная техника оглушает врага.",
    en: "No picking between rounds: your jutsu rotate 1 → 2 → 3. During the countdown switch with keys 1–3 or a click. A mistake costs chakra and 1.5 s; a perfect jutsu staggers the enemy.",
  },
  toBattle: { ru: "В БОЙ ▸", en: "TO BATTLE ▸" },
  picked: { ru: "Выбрано {a} / {b}", en: "Picked {a} / {b}" },
  nextUp: { ru: "ДАЛЕЕ", en: "NEXT" },
  switchHint: { ru: "1–3 — сменить", en: "1–3 to switch" },
  rage: { ru: "ЯРОСТЬ", en: "RAGE" },
  rageTip: { ru: "Враг в ярости: бьёт сильнее, время на печати меньше", en: "Enraged: hits harder, less time for seals" },
  mistakeCost: { ru: "−{hp} чакры · −{s} с", en: "−{hp} chakra · −{s}s" },
  rShield: { ru: "ЩИТ ×{n}", en: "SHIELD ×{n}" },
  rBoost: { ru: "×{n} СЛЕДУЮЩИЙ", en: "NEXT ×{n}" },
  rBurn: { ru: "ГОРЕНИЕ {n}", en: "BURN {n}" },
  rSummon: { ru: "ПРИЗЫВ {n}", en: "SUMMON {n}" },
  repBurn: { ru: "Пламя жжёт: −{n}", en: "Flames burn: −{n}" },
  repSummon: { ru: "Призыв атакует: −{n}", en: "Summon attacks: −{n}" },
  repStagger: { ru: "Идеально! Враг оглушён и не отвечает", en: "Perfect! The enemy is staggered and can't answer" },
  repBlocked: { ru: "Щит поглотил ответный удар", en: "Your shield absorbed the counter" },
  repRetaliate: { ru: "{foe} отвечает: −{n} чакры", en: "{foe} answers: −{n} chakra" },
  tagCrit: { ru: "КРИТ ×1.9", en: "CRIT ×1.9" },
  tagBoosted: { ru: "КЛОНЫ ×1.8", en: "CLONES ×1.8" },
  tagExecute: { ru: "КАЗНЬ ×2.2", en: "EXECUTE ×2.2" },
  tagShield: { ru: "ЩИТ", en: "SHIELD" },
  tagBurn: { ru: "ПОДЖОГ", en: "BURNING" },
  tagSummon: { ru: "ПРИЗЫВ", en: "SUMMONED" },
  tagHeal: { ru: "+ЧАКРА", en: "+CHAKRA" },
  tagRecoil: { ru: "ОТДАЧА", en: "RECOIL" },
  tagCombo: { ru: "ШКВАЛ КОМБО", en: "COMBO BARRAGE" },
  effShield: { ru: "Щит: блокирует {n} удар(а) врага", en: "Shield: blocks {n} enemy hit(s)" },
  effBoost: { ru: "Клоны: следующая техника ×{n} урона", en: "Clones: next jutsu deals ×{n}" },
  effBurn: { ru: "Горение: {d} урона в конце раунда, {t} раунда", en: "Burn: {d} damage at round end for {t} rounds" },
  effHeal: { ru: "Лечение: +{n} чакры", en: "Heal: +{n} chakra" },
  effPierce: { ru: "Пробой: без ошибок — ×{n} урона", en: "Pierce: ×{n} damage if cast without mistakes" },
  effCombo: { ru: "Шквал: +{n} урона за каждый пункт комбо", en: "Barrage: +{n} damage per combo point" },
  effSummon: { ru: "Призыв: {d} урона {t} раунда + блок 1 удара", en: "Summon: {d} damage for {t} rounds + blocks 1 hit" },
  effExecute: { ru: "Казнь: ×{n} урона, если у врага меньше {p}%", en: "Execute: ×{n} damage if the enemy is below {p}%" },
  effRecoil: { ru: "Отдача: огромный урон, но −{n} твоей чакры", en: "Recoil: huge damage, but costs {n} of your chakra" },
  effNone: { ru: "Чистая сила: высокий урон за 3 печати", en: "Pure force: big damage for just 3 seals" },
  arcLabel: { ru: "Часть", en: "Part" },
  specialSeals: { ru: "+ 12 ОСОБЫХ ПЕЧАТЕЙ", en: "+ 12 SPECIAL SEALS" },
} satisfies Record<string, L>;

export type StrKey = keyof typeof STR;

export function t(key: StrKey, params?: Record<string, string | number>): string {
  return tr(STR[key], params);
}
