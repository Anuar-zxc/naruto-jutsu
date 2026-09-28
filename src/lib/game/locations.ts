import type { L } from "@/types/i18n";

export type LocationId = "academy" | "bridge" | "forest" | "village" | "rain" | "battlefield" | "crater" | "valley" | "moon";

/** SVG scenes drawn in code (see components/StageScenes.tsx). */
export type SceneId = "bridge" | "forest" | "rain" | "battlefield" | "crater" | "moon";

export interface Location {
  id: LocationId;
  name: L;
  /** Licensed background artwork … */
  image?: string;
  /** … or an original SVG scene. */
  scene?: SceneId;
}

export const LOCATIONS: Record<LocationId, Location> = {
  academy: { id: "academy", name: { ru: "Академия ниндзя", en: "Ninja Academy" }, image: "/assets/backgrounds/academy.webp" },
  bridge: { id: "bridge", name: { ru: "Мост в Стране Волн", en: "The Great Bridge, Land of Waves" }, scene: "bridge" },
  forest: { id: "forest", name: { ru: "Лес Смерти", en: "Forest of Death" }, scene: "forest" },
  village: { id: "village", name: { ru: "Деревня Скрытого Листа", en: "Hidden Leaf Village" }, image: "/assets/backgrounds/village.webp" },
  rain: { id: "rain", name: { ru: "Деревня Скрытого Дождя", en: "Hidden Rain Village" }, scene: "rain" },
  battlefield: { id: "battlefield", name: { ru: "Поле битвы Четвёртой войны", en: "Fourth War Battlefield" }, scene: "battlefield" },
  crater: { id: "crater", name: { ru: "Кратер Десятихвостого", en: "Ten-Tails Crater" }, scene: "crater" },
  valley: { id: "valley", name: { ru: "Долина Завершения", en: "Valley of the End" }, image: "/assets/backgrounds/valley.webp" },
  moon: { id: "moon", name: { ru: "Измерение Кагуи", en: "Kaguya's Dimension" }, scene: "moon" },
};

/** Quick battle cycles through these, one per round. */
export const QUICK_ROTATION: LocationId[] = ["village", "valley", "academy", "battlefield", "rain", "crater"];
