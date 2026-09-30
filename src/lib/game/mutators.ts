/**
 * Fight modifiers (the Daily Challenge rolls two of them) and survival boons
 * (pick one of three after every wave). Pure data + deterministic pickers.
 */
import type { Element } from "@/types/game";
import type { L } from "@/types/i18n";
import type { CharacterId } from "./characters";

export type MutatorId = "haste" | "berserk" | "giant" | "glass" | "fire" | "lightning" | "chakra" | "precise" | "sage" | "fog";

export interface Mutator {
  id: MutatorId;
  kanji: string;
  name: L;
  desc: L;
  timeMult?: number;
  enemyDmgMult?: number;
  enemyHpMult?: number;
  playerHpMult?: number;
  playerDmgMult?: number;
  mistakeMult?: number;
  /** Only jutsu of these elements may be picked. */
  elements?: Element[];
  /** Start the fight with a full sage gauge. */
  sageStart?: boolean;
  /** Seal pictograms are hidden (memory!). UI-only. */
  hidePictograms?: boolean;
  rewardMult: number;
}

export const MUTATORS: Record<MutatorId, Mutator> = {
  haste: { id: "haste", kanji: "疾", name: { ru: "Спешка", en: "Haste" }, desc: { ru: "−30% времени на каждую технику", en: "−30% time on every jutsu" }, timeMult: 0.7, rewardMult: 1.5 },
  berserk: { id: "berserk", kanji: "狂", name: { ru: "Берсерк", en: "Berserk" }, desc: { ru: "Враг бьёт в 1.5 раза сильнее", en: "The enemy hits 1.5× harder" }, enemyDmgMult: 1.5, rewardMult: 1.5 },
  giant: { id: "giant", kanji: "巨", name: { ru: "Гигант", en: "Giant" }, desc: { ru: "У врага в 1.5 раза больше здоровья", en: "The enemy has 1.5× health" }, enemyHpMult: 1.5, rewardMult: 1.4 },
  glass: { id: "glass", kanji: "硝", name: { ru: "Стеклянная пушка", en: "Glass Cannon" }, desc: { ru: "У тебя вдвое меньше чакры, но урон ×1.5", en: "Half your chakra, but ×1.5 damage" }, playerHpMult: 0.5, playerDmgMult: 1.5, rewardMult: 1.5 },
  fire: { id: "fire", kanji: "火", name: { ru: "Только огонь", en: "Fire Only" }, desc: { ru: "Доступны только огненные техники", en: "Only fire jutsu may be used" }, elements: ["fire"], rewardMult: 1.3 },
  lightning: { id: "lightning", kanji: "雷", name: { ru: "Только молния", en: "Lightning Only" }, desc: { ru: "Только Чидори и Кирин", en: "Only Chidori and Kirin" }, elements: ["lightning"], rewardMult: 1.4 },
  chakra: { id: "chakra", kanji: "気", name: { ru: "Чистая чакра", en: "Pure Chakra" }, desc: { ru: "Только техники чакры", en: "Only chakra jutsu" }, elements: ["chakra"], rewardMult: 1.2 },
  precise: { id: "precise", kanji: "精", name: { ru: "Абсолютная точность", en: "Absolute Precision" }, desc: { ru: "Ошибка стоит втрое дороже", en: "Mistakes cost 3× more" }, mistakeMult: 3, rewardMult: 1.4 },
  sage: { id: "sage", kanji: "仙", name: { ru: "Благословение мудреца", en: "Sage's Blessing" }, desc: { ru: "Шкала мудреца полная с начала боя", en: "The sage gauge starts full" }, sageStart: true, rewardMult: 1 },
  fog: { id: "fog", kanji: "霧", name: { ru: "Туман", en: "Mist" }, desc: { ru: "Подсказки рук скрыты — печати по памяти", en: "Hand pictures hidden — seals from memory" }, hidePictograms: true, rewardMult: 1.4 },
};

export const MUTATOR_LIST = Object.values(MUTATORS);

/** Combined effect of several modifiers. */
export function combine(ids: MutatorId[]) {
  const ms = ids.map((id) => MUTATORS[id]).filter(Boolean);
  const prod = (k: keyof Mutator) => ms.reduce((a, m) => a * ((m[k] as number | undefined) ?? 1), 1);
  const elements = ms.find((m) => m.elements)?.elements ?? null;
  return {
    timeMult: prod("timeMult"),
    enemyDmgMult: prod("enemyDmgMult"),
    enemyHpMult: prod("enemyHpMult"),
    playerHpMult: prod("playerHpMult"),
    playerDmgMult: prod("playerDmgMult"),
    mistakeMult: prod("mistakeMult"),
    rewardMult: prod("rewardMult"),
    elements,
    sageStart: ms.some((m) => m.sageStart),
    hidePictograms: ms.some((m) => m.hidePictograms),
  };
}

// --- Daily challenge ----------------------------------------------------------------
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** Small deterministic PRNG. */
export function rng(seed: number) {
  let x = seed || 1;
  return () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    return ((x >>> 0) % 100000) / 100000;
  };
}

export const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const DAILY_FOES: CharacterId[] = ["itachi", "madara", "pain", "orochimaru", "kakuzu", "deidara", "sasori", "zabuza", "kisame", "hidan", "kaguya", "momoshiki", "isshiki", "indra", "obito", "kabuto", "danzo", "nagato", "kimimaro", "haku"];
export const DAILY_HP = 1400;
export const DAILY_REWARD = 400;

/** Today's challenge: same for everyone on the same date. */
export function dailyFor(key = todayKey()) {
  const r = rng(hash(key));
  const foe = DAILY_FOES[Math.floor(r() * DAILY_FOES.length)];
  const pool = MUTATOR_LIST.map((m) => m.id);
  const first = pool[Math.floor(r() * pool.length)];
  const rest = pool.filter((id) => id !== first && !(MUTATORS[id].elements && MUTATORS[first].elements));
  const second = rest[Math.floor(r() * rest.length)];
  const mutators: MutatorId[] = [first, second];
  return { key, foe, mutators, reward: Math.round(DAILY_REWARD * combine(mutators).rewardMult) };
}

// --- Survival boons --------------------------------------------------------------------
export type BoonId = "uzumaki" | "sennin" | "ancestors" | "bloodlust" | "quickhands" | "medic" | "greed" | "focus";

export interface Boon {
  id: BoonId;
  kanji: string;
  name: L;
  desc: L;
}

export const BOONS: Record<BoonId, Boon> = {
  uzumaki: { id: "uzumaki", kanji: "渦", name: { ru: "Кровь Узумаки", en: "Uzumaki Blood" }, desc: { ru: "+200 к максимуму чакры и +200 чакры сейчас", en: "+200 max chakra and +200 chakra now" } },
  sennin: { id: "sennin", kanji: "仙", name: { ru: "Сила сеннина", en: "Sennin Power" }, desc: { ru: "+60 к шкале мудреца", en: "+60 sage gauge" } },
  ancestors: { id: "ancestors", kanji: "護", name: { ru: "Щит предков", en: "Ancestral Guard" }, desc: { ru: "+2 щита", en: "+2 shields" } },
  bloodlust: { id: "bloodlust", kanji: "血", name: { ru: "Жажда битвы", en: "Bloodlust" }, desc: { ru: "+12% урона до конца забега", en: "+12% damage for the rest of the run" } },
  quickhands: { id: "quickhands", kanji: "速", name: { ru: "Быстрые руки", en: "Quick Hands" }, desc: { ru: "+1.5 с на технику до конца забега", en: "+1.5 s per jutsu for the rest of the run" } },
  medic: { id: "medic", kanji: "医", name: { ru: "Ирьёниндзюцу", en: "Medical Ninjutsu" }, desc: { ru: "Восстановить 40% чакры", en: "Restore 40% chakra" } },
  greed: { id: "greed", kanji: "両", name: { ru: "Жадность", en: "Greed" }, desc: { ru: "+30% рё за волны до конца забега", en: "+30% ryō per wave for the rest of the run" } },
  focus: { id: "focus", kanji: "心", name: { ru: "Хладнокровие", en: "Cold Focus" }, desc: { ru: "Ошибки стоят на 40% меньше до конца забега", en: "Mistakes cost 40% less for the rest of the run" } },
};

/** Three different boons for a wave (deterministic per wave + seed). */
export function boonOffer(wave: number, seed: number): BoonId[] {
  const r = rng(hash(`${wave}:${seed}`));
  const ids = Object.keys(BOONS) as BoonId[];
  const out: BoonId[] = [];
  while (out.length < 3) {
    const id = ids[Math.floor(r() * ids.length)];
    if (!out.includes(id)) out.push(id);
  }
  return out;
}
