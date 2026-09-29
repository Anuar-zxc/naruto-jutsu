/**
 * The twelve zodiac hand seals.
 *
 * Real seals interlock the fingers of both hands, and a webcam hand tracker
 * cannot see fingers hidden behind the other hand. So every seal here is a
 * camera-readable approximation built from what the tracker CAN see reliably:
 * a hand shape per hand + how the hands relate (distance, height, direction).
 * Where possible the approximation keeps the look of the real seal:
 *   Tiger — index+middle up on both hands      Dog  — open palm resting ON a fist
 *   Horse — index fingers up, touching         Boar — "tusks" (index+pinky) over a fist
 *   Snake — two clasped fists                  Rat  — two fingers wrapped by a fist
 * Every pair of seals differs in at least one clearly visible feature.
 */
import type { HandShape, HandShapeId, SignDefinition, SignId } from "@/types/gestures";

export const HAND_SHAPES: Record<HandShapeId, HandShape> = {
  FIST: { id: "FIST", label: "fist", fingers: { index: 0, middle: 0, ring: 0, pinky: 0 } },
  OPEN: { id: "OPEN", label: "open palm", fingers: { index: 1, middle: 1, ring: 1, pinky: 1 } },
  INDEX: { id: "INDEX", label: "index finger up", fingers: { index: 1, middle: 0, ring: 0, pinky: 0 } },
  PEACE: { id: "PEACE", label: "index + middle up", fingers: { index: 1, middle: 1, ring: 0, pinky: 0 } },
  HORNS: { id: "HORNS", label: "index + pinky up", fingers: { index: 1, middle: 0, ring: 0, pinky: 1 } },
};

/** Hands closer than this (palm lengths between palm centres) count as "together". */
export const CLOSE_MAX = 2.6;

const RULES: SignDefinition["correctionRules"] = ["hands", "size", "shape", "fingers", "distance", "stack", "orientation"];
const base = { requiredHands: 2 as const, tolerance: 0.45, threshold: 0.66, correctionRules: RULES };

export const SIGNS: Record<SignId, SignDefinition> = {
  RAT: {
    ...base,
    id: "RAT",
    kanji: "子",
    name: { en: "Rat", ru: "Крыса" },
    howTo: { en: "One hand: index + middle up. Other hand: fist wrapped around them", ru: "Одна рука: указательный и средний вверх. Другая — кулак рядом, обхватывает их" },
    shapes: ["PEACE", "FIST"],
    distance: { max: CLOSE_MAX },
  },
  OX: {
    ...base,
    id: "OX",
    kanji: "丑",
    name: { en: "Ox", ru: "Бык" },
    howTo: { en: "Open palm and fist side by side, at the same height", ru: "Раскрытая ладонь и кулак рядом, на одной высоте" },
    shapes: ["OPEN", "FIST"],
    stack: "side",
  },
  TIGER: {
    ...base,
    id: "TIGER",
    kanji: "寅",
    name: { en: "Tiger", ru: "Тигр" },
    howTo: { en: "Both hands: index + middle up, hands together", ru: "Обе руки: указательный и средний вверх, руки вместе" },
    shapes: ["PEACE", "PEACE"],
    distance: { max: CLOSE_MAX },
    pointUp: true,
  },
  RABBIT: {
    ...base,
    id: "RABBIT",
    kanji: "卯",
    name: { en: "Rabbit", ru: "Кролик" },
    howTo: { en: "One hand: index finger up. Other hand: fist", ru: "Одна рука: только указательный вверх. Другая — кулак" },
    shapes: ["INDEX", "FIST"],
  },
  DRAGON: {
    ...base,
    id: "DRAGON",
    kanji: "辰",
    name: { en: "Dragon", ru: "Дракон" },
    howTo: { en: "Both hands: horns — index + pinky up", ru: "Обе руки: «рога» — указательный и мизинец вверх" },
    shapes: ["HORNS", "HORNS"],
    threshold: 0.64,
  },
  SNAKE: {
    ...base,
    id: "SNAKE",
    kanji: "巳",
    name: { en: "Snake", ru: "Змея" },
    howTo: { en: "Two fists clasped close together", ru: "Два кулака, сжатые вплотную" },
    shapes: ["FIST", "FIST"],
    distance: { max: CLOSE_MAX },
  },
  HORSE: {
    ...base,
    id: "HORSE",
    kanji: "午",
    name: { en: "Horse", ru: "Лошадь" },
    howTo: { en: "Both index fingers up, touching — a triangle", ru: "Оба указательных вверх, касаются — треугольник" },
    shapes: ["INDEX", "INDEX"],
    distance: { max: CLOSE_MAX },
    pointUp: true,
  },
  RAM: {
    ...base,
    id: "RAM",
    kanji: "未",
    name: { en: "Ram", ru: "Баран" },
    howTo: { en: "One hand: index + middle up. Other hand: index only", ru: "Одна рука: указательный и средний. Другая: только указательный" },
    shapes: ["PEACE", "INDEX"],
  },
  MONKEY: {
    ...base,
    id: "MONKEY",
    kanji: "申",
    name: { en: "Monkey", ru: "Обезьяна" },
    howTo: { en: "Both palms open, fingers pointing up", ru: "Обе ладони раскрыты, пальцы смотрят вверх" },
    shapes: ["OPEN", "OPEN"],
    pointUp: true,
    stack: "side",
  },
  BIRD: {
    ...base,
    id: "BIRD",
    kanji: "酉",
    name: { en: "Bird", ru: "Птица" },
    howTo: { en: "One open palm, one index finger up", ru: "Одна ладонь раскрыта, на другой — указательный вверх" },
    shapes: ["OPEN", "INDEX"],
  },
  DOG: {
    ...base,
    id: "DOG",
    kanji: "戌",
    name: { en: "Dog", ru: "Собака" },
    howTo: { en: "Open palm held ABOVE a fist", ru: "Раскрытая ладонь НАД кулаком" },
    shapes: ["OPEN", "FIST"],
    stack: "topFirst",
  },
  BOAR: {
    ...base,
    id: "BOAR",
    kanji: "亥",
    name: { en: "Boar", ru: "Кабан" },
    howTo: { en: "Boar tusks: index + pinky up on one hand, the other hand a fist", ru: "Клыки кабана: на одной руке указательный и мизинец вверх, другая — кулак" },
    shapes: ["HORNS", "FIST"],
  },

  // --- Special seals (not part of the zodiac): used by advanced jutsu --------
  CONFRONT: {
    ...base,
    id: "CONFRONT",
    kanji: "対",
    name: { en: "Confrontation", ru: "Противостояние" },
    howTo: { en: "One open palm, the other hand index + middle up", ru: "Одна ладонь раскрыта, на другой — указательный и средний вверх" },
    shapes: ["OPEN", "PEACE"],
  },
  WIND: {
    ...base,
    id: "WIND",
    kanji: "風",
    name: { en: "Wind", ru: "Ветер" },
    howTo: { en: "One open palm, the other hand index + pinky up", ru: "Одна ладонь раскрыта, на другой — указательный и мизинец вверх" },
    shapes: ["OPEN", "HORNS"],
  },
  SPIRIT: {
    ...base,
    id: "SPIRIT",
    kanji: "霊",
    name: { en: "Spirit", ru: "Дух" },
    howTo: { en: "One index finger up, the other hand index + pinky up", ru: "На одной руке указательный вверх, на другой — указательный и мизинец" },
    shapes: ["INDEX", "HORNS"],
  },
  FOX: {
    ...base,
    id: "FOX",
    kanji: "狐",
    name: { en: "Fox", ru: "Лис" },
    howTo: { en: "One hand index + middle up, the other index + pinky up", ru: "На одной руке указательный и средний, на другой — указательный и мизинец" },
    shapes: ["PEACE", "HORNS"],
  },
};

/** The twelve zodiac seals (the classic set). */
export const ZODIAC: SignId[] = ["RAT", "OX", "TIGER", "RABBIT", "DRAGON", "SNAKE", "HORSE", "RAM", "MONKEY", "BIRD", "DOG", "BOAR"];

export const SIGN_LIST: SignDefinition[] = Object.values(SIGNS);
