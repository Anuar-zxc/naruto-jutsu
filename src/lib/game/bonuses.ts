/**
 * Bonuses: one flat bag of combat modifiers that everything permanent feeds
 * into — the clan's passive, talents from the clan tree, the equipped eye and
 * weapon. The reducer only ever reads the summed result (state.bonuses).
 *
 * Percentages are fractions: dmg 0.1 = +10% damage.
 */
import type { Element } from "@/types/game";

export type BonusFlag =
  /** Immune to Itachi's Tsukuyomi (seals are never reversed). */
  | "noGenjutsu"
  /** Pain's Shinra Tensei can't repel your jutsu. */
  | "noShinra"
  /** The Mist modifier doesn't hide the hand pictures. */
  | "noFog"
  /** Kaguya's dimension shift doesn't shorten your timers. */
  | "noDimension";

export interface Bonuses {
  /** +% damage for every jutsu. */
  dmg: number;
  /** +% damage per element. */
  el: Partial<Record<Element, number>>;
  /** +% max chakra. */
  hp: number;
  /** Extra time on every jutsu (ms). */
  timeMs: number;
  /** Mistakes cost this much less (0.2 = −20%). */
  mistake: number;
  /** Shields at the start of every fight. */
  shields: number;
  /** Sage gauge at the start of every fight (0..100). */
  sageStart: number;
  /** Extra sage gauge per correct seal. */
  sageSeal: number;
  /** Enemy damage taken is reduced by this much (negative = you take more). */
  taken: number;
  /** Heal this share of max chakra after every successful jutsu. */
  healCast: number;
  /** Heal this share of the damage you deal. */
  lifesteal: number;
  /** +% damage on a perfect (mistake-free) jutsu. */
  perfect: number;
  /** +% burn damage. */
  burn: number;
  /** +% damage while the enemy is below 35% chakra. */
  execute: number;
  /** +% ryō from fights. */
  ryo: number;
  /** +% shinobi XP. */
  xp: number;
  flags: BonusFlag[];
}

export type BonusPart = Partial<Omit<Bonuses, "el" | "flags">> & { el?: Partial<Record<Element, number>>; flags?: BonusFlag[] };

export const noBonuses = (): Bonuses => ({
  dmg: 0,
  el: {},
  hp: 0,
  timeMs: 0,
  mistake: 0,
  shields: 0,
  sageStart: 0,
  sageSeal: 0,
  taken: 0,
  healCast: 0,
  lifesteal: 0,
  perfect: 0,
  burn: 0,
  execute: 0,
  ryo: 0,
  xp: 0,
  flags: [],
});

const NUM_KEYS = ["dmg", "hp", "timeMs", "mistake", "shields", "sageStart", "sageSeal", "taken", "healCast", "lifesteal", "perfect", "burn", "execute", "ryo", "xp"] as const;

/** Add several bonus parts together. */
export function sumBonuses(parts: (BonusPart | null | undefined)[]): Bonuses {
  const out = noBonuses();
  for (const p of parts) {
    if (!p) continue;
    for (const k of NUM_KEYS) out[k] += p[k] ?? 0;
    for (const [e, v] of Object.entries(p.el ?? {})) out.el[e as Element] = (out.el[e as Element] ?? 0) + (v ?? 0);
    for (const f of p.flags ?? []) if (!out.flags.includes(f)) out.flags.push(f);
  }
  // Keep the game winnable and losable: hard caps on the defensive stats.
  out.mistake = Math.min(0.7, out.mistake);
  out.taken = Math.max(-0.5, Math.min(0.6, out.taken));
  out.sageStart = Math.min(100, out.sageStart);
  return out;
}

export const hasFlag = (b: Bonuses | undefined, f: BonusFlag) => !!b?.flags.includes(f);

const pct = (v: number) => `${v > 0 ? "+" : "−"}${Math.round(Math.abs(v) * 100)}%`;
const EL: Record<Element, { ru: string; en: string }> = {
  fire: { ru: "огню", en: "Fire" },
  water: { ru: "воде", en: "Water" },
  lightning: { ru: "молнии", en: "Lightning" },
  chakra: { ru: "чакре", en: "Chakra" },
  wind: { ru: "ветру", en: "Wind" },
};
const FLAG: Record<BonusFlag, { ru: string; en: string }> = {
  noGenjutsu: { ru: "иммунитет к Цукуёми", en: "immune to Tsukuyomi" },
  noShinra: { ru: "пробивает Шинра Тенсей", en: "pierces Shinra Tensei" },
  noFog: { ru: "видит сквозь Туман", en: "sees through the Mist" },
  noDimension: { ru: "не боится смены измерений", en: "unfazed by dimension shifts" },
};

/** Short human-readable lines for a bonus part (shop cards, talent nodes). */
export function describeBonus(b: BonusPart, lang: "ru" | "en"): string[] {
  const ru = lang === "ru";
  const out: string[] = [];
  if (b.dmg) out.push(ru ? `${pct(b.dmg)} урона` : `${pct(b.dmg)} damage`);
  for (const [e, v] of Object.entries(b.el ?? {})) if (v) out.push(ru ? `${pct(v)} к ${EL[e as Element].ru}` : `${pct(v)} ${EL[e as Element].en}`);
  if (b.hp) out.push(ru ? `${pct(b.hp)} чакры` : `${pct(b.hp)} chakra`);
  if (b.timeMs) out.push(ru ? `+${(b.timeMs / 1000).toFixed(1).replace(".0", "")} с на технику` : `+${(b.timeMs / 1000).toFixed(1).replace(".0", "")}s per jutsu`);
  if (b.mistake) out.push(ru ? `ошибки ${pct(-b.mistake)}` : `mistakes ${pct(-b.mistake)}`);
  if (b.shields) out.push(ru ? `+${b.shields} щит в начале боя` : `+${b.shields} shield at the start`);
  if (b.sageStart) out.push(ru ? `мудрец +${b.sageStart} на старте` : `sage +${b.sageStart} at the start`);
  if (b.sageSeal) out.push(ru ? `мудрец +${b.sageSeal} за печать` : `sage +${b.sageSeal} per seal`);
  if (b.taken) out.push(ru ? `получаемый урон ${pct(-b.taken)}` : `damage taken ${pct(-b.taken)}`);
  if (b.healCast) out.push(ru ? `лечение ${pct(b.healCast)} за технику` : `heal ${pct(b.healCast)} per jutsu`);
  if (b.lifesteal) out.push(ru ? `вампиризм ${Math.round(b.lifesteal * 100)}%` : `lifesteal ${Math.round(b.lifesteal * 100)}%`);
  if (b.perfect) out.push(ru ? `${pct(b.perfect)} к идеальной технике` : `${pct(b.perfect)} on perfect jutsu`);
  if (b.burn) out.push(ru ? `${pct(b.burn)} к горению` : `${pct(b.burn)} burn`);
  if (b.execute) out.push(ru ? `${pct(b.execute)} по врагу <35%` : `${pct(b.execute)} vs enemy <35%`);
  if (b.ryo) out.push(ru ? `${pct(b.ryo)} рё` : `${pct(b.ryo)} ryō`);
  if (b.xp) out.push(ru ? `${pct(b.xp)} опыта` : `${pct(b.xp)} XP`);
  for (const f of b.flags ?? []) out.push(FLAG[f][lang]);
  return out;
}
