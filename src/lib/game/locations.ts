import type { L } from "@/types/i18n";

export type LocationId =
  | "academy"
  | "bridge"
  | "arena"
  | "forest"
  | "village"
  | "konohanight"
  | "rain"
  | "ruins"
  | "battlefield"
  | "desert"
  | "redmoon"
  | "crater"
  | "valley"
  | "moon"
  | "villagenight"
  | "hideout"
  | "lair"
  | "suna"
  | "stone"
  | "tenchi"
  | "canyon"
  | "cliffs"
  | "tsukuyomi"
  | "mistlake"
  | "tanzaku"
  | "soundborder"
  | "narawoods"
  | "summit"
  | "raintower";

/** SVG scenes drawn in code (see components/StageScenes.tsx) — fallback when no artwork. */
export type SceneId = "bridge" | "forest" | "rain" | "battlefield" | "crater" | "moon";

export interface Location {
  id: LocationId;
  name: L;
  /** Background artwork supplied by the project owner … */
  image?: string;
  /** … or an original SVG scene. */
  scene?: SceneId;
}

const img = (f: string) => `/assets/backgrounds/${f}.webp`;

export const LOCATIONS: Record<LocationId, Location> = {
  academy: { id: "academy", name: { ru: "Академия ниндзя", en: "Ninja Academy" }, image: img("academy") },
  bridge: { id: "bridge", name: { ru: "Мост в тумане, Страна Волн", en: "Misty Bridge, Land of Waves" }, image: img("mistbridge"), scene: "bridge" },
  arena: { id: "arena", name: { ru: "Арена экзамена на чунина", en: "Chūnin Exam Arena" }, image: img("arena") },
  forest: { id: "forest", name: { ru: "Лес Смерти", en: "Forest of Death" }, image: img("forest"), scene: "forest" },
  village: { id: "village", name: { ru: "Деревня Скрытого Листа", en: "Hidden Leaf Village" }, image: img("village") },
  konohanight: { id: "konohanight", name: { ru: "Коноха под красной луной", en: "The Leaf under a Red Moon" }, image: img("konohanight") },
  rain: { id: "rain", name: { ru: "Деревня Скрытого Дождя", en: "Hidden Rain Village" }, image: img("rain"), scene: "rain" },
  ruins: { id: "ruins", name: { ru: "Руины Конохи", en: "Ruins of the Leaf" }, image: img("ruins") },
  battlefield: { id: "battlefield", name: { ru: "Поле Четвёртой войны", en: "Fourth War Battlefield" }, image: img("war"), scene: "battlefield" },
  desert: { id: "desert", name: { ru: "Пустыня союзных сил", en: "Allied Forces Desert" }, image: img("desert") },
  redmoon: { id: "redmoon", name: { ru: "Лес под красной луной", en: "Forest under the Red Moon" }, image: img("redmoon") },
  crater: { id: "crater", name: { ru: "Кратер", en: "The Crater" }, image: img("crater"), scene: "crater" },
  valley: { id: "valley", name: { ru: "Долина Завершения", en: "Valley of the End" }, image: img("valley") },
  moon: { id: "moon", name: { ru: "Лунный кратер", en: "Lunar Crater" }, image: img("mooncrater"), scene: "moon" },
  villagenight: { id: "villagenight", name: { ru: "Ночная Коноха", en: "The Leaf at Night" }, image: img("villagenight") },
  hideout: { id: "hideout", name: { ru: "Логово Акацуки", en: "Akatsuki Hideout" }, image: img("hideout") },
  lair: { id: "lair", name: { ru: "Подземное логово", en: "Underground Lair" }, image: img("lair") },
  suna: { id: "suna", name: { ru: "Деревня Скрытого Песка", en: "Hidden Sand Village" }, image: img("suna") },
  stone: { id: "stone", name: { ru: "Деревня Скрытого Камня", en: "Hidden Stone Village" }, image: img("stone") },
  tenchi: { id: "tenchi", name: { ru: "Мост Тэнти", en: "Tenchi Bridge" }, image: img("bridge") },
  canyon: { id: "canyon", name: { ru: "Каньон тренировок", en: "Training Canyon" }, image: img("canyon") },
  cliffs: { id: "cliffs", name: { ru: "Лунные скалы", en: "Moonlit Cliffs" }, image: img("cliffs") },
  mistlake: { id: "mistlake", name: { ru: "Озеро в тумане, Страна Волн", en: "Misty Lake, Land of Waves" }, image: img("mistlake") },
  tanzaku: { id: "tanzaku", name: { ru: "Город Танзаку", en: "Tanzaku Town" }, image: img("tanzaku") },
  soundborder: { id: "soundborder", name: { ru: "Граница Страны Звука", en: "Land of Sound Border" }, image: img("soundborder") },
  narawoods: { id: "narawoods", name: { ru: "Лес клана Нара", en: "Nara Clan Forest" }, image: img("narawoods") },
  summit: { id: "summit", name: { ru: "Страна Железа, совет Каге", en: "Land of Iron, Kage Summit" }, image: img("summit") },
  raintower: { id: "raintower", name: { ru: "Башня Нагато", en: "Nagato's Tower" }, image: img("raintower") },
  tsukuyomi: { id: "tsukuyomi", name: { ru: "Бесконечное Цукуёми", en: "Infinite Tsukuyomi" }, image: img("tsukuyomi") },
};

/** Quick battle cycles through these, one per fight/round. */
export const QUICK_ROTATION: LocationId[] = [
  "village", "arena", "forest", "suna", "rain", "battlefield", "valley", "hideout",
  "stone", "desert", "konohanight", "tenchi", "canyon", "redmoon", "cliffs", "tsukuyomi", "lair", "ruins",
  "mistlake", "tanzaku", "soundborder", "narawoods", "summit", "raintower",
];
