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
  detected: { ru: "РАСПОЗНАНО", en: "DETECTED" },
  noHands: { ru: "НЕТ РУК", en: "NO HANDS" },
  noSeal: { ru: "НЕТ ПЕЧАТИ", en: "NO SEAL" },
  adjust: { ru: "ПОПРАВЬ", en: "ADJUST" },
  incorrect: { ru: "НЕВЕРНО — ЭТО {sign}", en: "INCORRECT — THAT'S {sign}" },
  sideNote: { ru: "Покажи обе руки камере, чтобы начать испытание.", en: "Show both hands to the camera to begin the trial." },

  // mode select
  chooseMode: { ru: "ВЫБЕРИ РЕЖИМ", en: "CHOOSE A MODE" },
  storyTitle: { ru: "ИСТОРИЯ", en: "STORY" },
  storyDesc: { ru: "12 глав, 9 локаций, 11 злодеев. Диалоги, наставник и новые техники по ходу истории.", en: "12 chapters, 9 locations, 11 villains. Dialogue, a mentor and new jutsu along the way." },
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
  chooseAnother: { ru: "ДРУГАЯ ТЕХНИКА", en: "CHOOSE ANOTHER" },

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
} satisfies Record<string, L>;

export type StrKey = keyof typeof STR;

export function t(key: StrKey, params?: Record<string, string | number>): string {
  return tr(STR[key], params);
}
