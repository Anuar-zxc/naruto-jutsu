/**
 * The armory: dōjutsu (eyes) and weapons bought with ryō. One eye and one
 * weapon can be equipped at a time; each gives a bonus (see bonuses.ts).
 */
import type { L } from "@/types/i18n";
import type { BonusPart } from "./bonuses";

export type ItemSlot = "eye" | "weapon";

export type ItemId =
  | "sharingan"
  | "mangekyo-itachi"
  | "mangekyo-sasuke"
  | "eternal"
  | "byakugan"
  | "rinnegan"
  | "rinne-sharingan"
  | "tenseigan"
  | "jougan"
  | "kunai"
  | "fuma"
  | "hiraishin"
  | "samehada"
  | "kubikiribocho"
  | "kusanagi"
  | "gunbai"
  | "hidan";

export type Rarity = "common" | "rare" | "epic" | "legend";

export interface Item {
  id: ItemId;
  slot: ItemSlot;
  kanji: string;
  name: L;
  lore: L;
  price: number;
  rarity: Rarity;
  image: string;
  /** Glow colour around the item. */
  color: string;
  bonus: BonusPart;
}

const eye = (id: string) => `/assets/items/eye-${id}.webp`;
const wpn = (id: string) => `/assets/items/wpn-${id}.webp`;

export const ITEMS: Record<ItemId, Item> = {
  sharingan: { id: "sharingan", slot: "eye", kanji: "写輪眼", name: { ru: "Шаринган", en: "Sharingan" }, lore: { ru: "Видит движения рук — печати складываются спокойнее.", en: "Reads hand movement — seals come calmer." }, price: 800, rarity: "rare", image: eye("sharingan"), color: "#ff1f3d", bonus: { timeMs: 1500, mistake: 0.1 } },
  "mangekyo-itachi": { id: "mangekyo-itachi", slot: "eye", kanji: "万華鏡", name: { ru: "Мангекё Итачи", en: "Itachi's Mangekyō" }, lore: { ru: "Цукуёми больше не властно над тобой.", en: "Tsukuyomi holds no power over you." }, price: 2200, rarity: "epic", image: eye("mangekyo-itachi"), color: "#d7263d", bonus: { dmg: 0.15, flags: ["noGenjutsu"] } },
  "mangekyo-sasuke": { id: "mangekyo-sasuke", slot: "eye", kanji: "炎遁", name: { ru: "Мангекё Саске", en: "Sasuke's Mangekyō" }, lore: { ru: "Чёрное пламя Аматэрасу горит дольше.", en: "Amaterasu's black flame burns longer." }, price: 2200, rarity: "epic", image: eye("mangekyo-sasuke"), color: "#7b2cbf", bonus: { el: { fire: 0.25 }, burn: 0.5 } },
  eternal: { id: "eternal", slot: "eye", kanji: "永遠", name: { ru: "Вечный Мангекё", en: "Eternal Mangekyō" }, lore: { ru: "Свет, который больше не угаснет.", en: "A light that will never fade again." }, price: 4000, rarity: "legend", image: eye("eternal"), color: "#ff3355", bonus: { dmg: 0.2, el: { fire: 0.1 }, shields: 1 } },
  byakugan: { id: "byakugan", slot: "eye", kanji: "白眼", name: { ru: "Бьякуган", en: "Byakugan" }, lore: { ru: "Обзор на 360° — ошибка почти невозможна.", en: "360° vision — mistakes almost impossible." }, price: 1200, rarity: "rare", image: eye("byakugan"), color: "#d8d2ff", bonus: { perfect: 0.25, mistake: 0.2 } },
  rinnegan: { id: "rinnegan", slot: "eye", kanji: "輪廻眼", name: { ru: "Риннеган", en: "Rinnegan" }, lore: { ru: "Глаз Шести Путей: Шинра Тенсей тебя не остановит.", en: "Eye of the Six Paths: Shinra Tensei won't stop you." }, price: 4500, rarity: "legend", image: eye("rinnegan"), color: "#a970ff", bonus: { dmg: 0.22, taken: 0.1, flags: ["noShinra"] } },
  "rinne-sharingan": { id: "rinne-sharingan", slot: "eye", kanji: "輪廻写輪眼", name: { ru: "Риннеган-Шаринган", en: "Rinne Sharingan" }, lore: { ru: "Глаз Кагуи. Сила мудреца — с первой секунды.", en: "Kaguya's eye. Sage power from the first second." }, price: 6500, rarity: "legend", image: eye("rinne-sharingan"), color: "#ff2d55", bonus: { dmg: 0.3, sageStart: 50 } },
  tenseigan: { id: "tenseigan", slot: "eye", kanji: "転生眼", name: { ru: "Тенсейган", en: "Tenseigan" }, lore: { ru: "Чакра луны лечит после каждой техники.", en: "Moon chakra heals you after every jutsu." }, price: 3800, rarity: "epic", image: eye("tenseigan"), color: "#5ad1ff", bonus: { el: { chakra: 0.25 }, healCast: 0.03 } },
  jougan: { id: "jougan", slot: "eye", kanji: "浄眼", name: { ru: "Джоган", en: "Jōgan" }, lore: { ru: "Видит скрытое: Туман и чужие измерения.", en: "Sees the hidden: the Mist and other dimensions." }, price: 3000, rarity: "epic", image: eye("jougan"), color: "#9fe0ff", bonus: { dmg: 0.12, flags: ["noFog", "noDimension"] } },

  kunai: { id: "kunai", slot: "weapon", kanji: "苦無", name: { ru: "Кунай", en: "Kunai" }, lore: { ru: "Первое оружие любого генина.", en: "Every genin's first weapon." }, price: 300, rarity: "common", image: wpn("kunai"), color: "#b8c4cc", bonus: { dmg: 0.05 } },
  fuma: { id: "fuma", slot: "weapon", kanji: "風魔", name: { ru: "Фума-сюрикен", en: "Fūma Shuriken" }, lore: { ru: "Складной сюрикен-мельница: сила ветра.", en: "The folding windmill shuriken: wind power." }, price: 700, rarity: "common", image: wpn("fuma"), color: "#5dffc1", bonus: { el: { wind: 0.15 } } },
  hiraishin: { id: "hiraishin", slot: "weapon", kanji: "飛雷神", name: { ru: "Кунай Минато", en: "Minato's Kunai" }, lore: { ru: "Метка Летящего Бога Грома: больше времени.", en: "Flying Thunder God mark: more time." }, price: 1600, rarity: "rare", image: wpn("hiraishin"), color: "#ffd166", bonus: { timeMs: 2000 } },
  samehada: { id: "samehada", slot: "weapon", kanji: "鮫肌", name: { ru: "Самехада", en: "Samehada" }, lore: { ru: "Живой меч, пожирающий чакру врага.", en: "A living sword that eats enemy chakra." }, price: 2500, rarity: "epic", image: wpn("samehada"), color: "#4a5a8a", bonus: { lifesteal: 0.08 } },
  kubikiribocho: { id: "kubikiribocho", slot: "weapon", kanji: "首斬り", name: { ru: "Кубикирибочо", en: "Kubikiribōchō" }, lore: { ru: "Меч Забузы. Добивает ослабевших.", en: "Zabuza's blade. Finishes off the weakened." }, price: 2000, rarity: "rare", image: wpn("kubikiribocho"), color: "#9aa7b0", bonus: { execute: 0.35, dmg: 0.08 } },
  kusanagi: { id: "kusanagi", slot: "weapon", kanji: "草薙", name: { ru: "Кусанаги", en: "Kusanagi" }, lore: { ru: "Клинок Саске, пропитанный Чидори.", en: "Sasuke's blade, laced with Chidori." }, price: 1800, rarity: "rare", image: wpn("kusanagi"), color: "#b28cff", bonus: { el: { lightning: 0.2 }, perfect: 0.1 } },
  gunbai: { id: "gunbai", slot: "weapon", kanji: "軍配", name: { ru: "Гунбай Мадары", en: "Madara's Gunbai" }, lore: { ru: "Веер-щит, отражающий любую атаку.", en: "A war fan that turns aside any attack." }, price: 2800, rarity: "epic", image: wpn("gunbai"), color: "#e63946", bonus: { shields: 1, taken: 0.15 } },
  hidan: { id: "hidan", slot: "weapon", kanji: "三刃", name: { ru: "Коса Хидана", en: "Hidan's Scythe" }, lore: { ru: "Кровь за кровь: пьёшь чакру, но и сам открыт.", en: "Blood for blood: you drink chakra but stand exposed." }, price: 1500, rarity: "rare", image: wpn("hidan"), color: "#c0392b", bonus: { lifesteal: 0.14, taken: -0.1 } },
};

export const ITEM_LIST = Object.values(ITEMS);
export const isItemId = (x: unknown): x is ItemId => typeof x === "string" && x in ITEMS;

export const RARITY_COLOR: Record<Rarity, string> = { common: "#b8c4cc", rare: "#4da3ff", epic: "#b36bff", legend: "#ffb020" };
export const RARITY_NAME: Record<Rarity, L> = {
  common: { ru: "обычное", en: "common" },
  rare: { ru: "редкое", en: "rare" },
  epic: { ru: "эпическое", en: "epic" },
  legend: { ru: "легендарное", en: "legendary" },
};
