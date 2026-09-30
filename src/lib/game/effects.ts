import type { Jutsu, Status } from "@/types/game";
import { t } from "@/lib/i18n";

/** Player-facing description of a jutsu's effect. */
export function effectText(j: Jutsu): string {
  const e = j.effect;
  switch (e.kind) {
    case "shield":
      return t("effShield", { n: e.hits });
    case "boost":
      return t("effBoost", { n: e.mult });
    case "burn":
      return t("effBurn", { d: e.dmg, t: e.turns });
    case "heal":
      return t("effHeal", { n: e.hp * 10 });
    case "pierce":
      return t("effPierce", { n: e.perfectMult });
    case "combo":
      return t("effCombo", { n: e.perCombo });
    case "summon":
      return t("effSummon", { d: e.dmg, t: e.turns });
    case "execute":
      return t("effExecute", { n: e.mult, p: Math.round(e.belowPct * 100) });
    case "recoil":
      return t("effRecoil", { n: e.hp * 10 });
    default:
      return t("effNone");
  }
}

export const EFFECT_ICON: Record<Jutsu["effect"]["kind"], string> = {
  shield: "🛡",
  boost: "✦",
  burn: "🔥",
  heal: "✚",
  pierce: "⚡",
  combo: "✺",
  summon: "🐸",
  execute: "☠",
  recoil: "🌀",
  none: "◉",
};

/** Active status chips for the HUD. */
export function statusChips(s: Status): { key: string; icon: string; text: string }[] {
  const out: { key: string; icon: string; text: string }[] = [];
  if (s.shield > 0) out.push({ key: "shield", icon: "🛡", text: t("rShield", { n: s.shield }) });
  if (s.boost > 1) out.push({ key: "boost", icon: "✦", text: t("rBoost", { n: s.boost }) });
  if (s.burn) out.push({ key: "burn", icon: "🔥", text: t("rBurn", { n: s.burn.turns }) });
  if (s.summon) out.push({ key: "summon", icon: "🐸", text: t("rSummon", { n: s.summon.turns }) });
  return out;
}

const TAG_KEY = {
  crit: "tagCrit",
  boosted: "tagBoosted",
  execute: "tagExecute",
  shield: "tagShield",
  burn: "tagBurn",
  summon: "tagSummon",
  heal: "tagHeal",
  recoil: "tagRecoil",
  combo: "tagCombo",
  sage: "tagSage",
  shout: "tagShout",
} as const;

export function tagText(tag: string): string | null {
  const k = TAG_KEY[tag as keyof typeof TAG_KEY];
  return k ? t(k) : null;
}
