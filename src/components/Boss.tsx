"use client";

import { forwardRef } from "react";
import { CHARACTERS, type CharacterId } from "@/lib/game/characters";
import type { Location } from "@/lib/game/locations";
import { t, tr } from "@/lib/i18n";
import { useLang } from "@/hooks/useLang";
import { HealthBar } from "./HealthBar";
import { ArenaBackdrop } from "./ArenaBackdrop";
import { Portrait } from "./Portrait";

interface Props {
  bossId: CharacterId | null;
  heroId: CharacterId | null;
  location: Location;
  hp: number;
  maxHp: number;
  /** Changes on each impact → replays the hit animation. */
  hitKey: number;
  damage: { amount: number; perfect: boolean; key: number } | null;
  defeated: boolean;
  hpDelayMs: number;
  taunt: string | null;
  /** Online duel: show the opponent's nickname instead of the character name. */
  nick?: string;
}

export const Boss = forwardRef<HTMLDivElement, Props>(function Boss({ bossId, heroId, location, hp, maxHp, hitKey, damage, defeated, hpDelayMs, taunt, nick }, ref) {
  useLang();
  const boss = bossId ? CHARACTERS[bossId] : null;
  const shadow = !!boss && boss.id === heroId;
  const name = nick ?? (boss ? (shadow ? t("shadowOf", { name: tr(boss.name) }) : tr(boss.name)) : "???");
  return (
    <div className="arena">
      <ArenaBackdrop location={location} showName={false} />
      <div className="stage-name">{tr(location.name)}</div>
      <div className="boss-head">
        <div className="boss-name">
          {name.toUpperCase()}
          <span className="boss-title">{boss ? tr(boss.title) : ""}</span>
        </div>
        <HealthBar hp={hp} max={maxHp} delayMs={hpDelayMs} />
      </div>
      <div className="arena-stage">
        <div className="arena-floor" />
        <div ref={ref} className={`boss ${defeated ? "defeated" : ""} ${shadow ? "shadow" : ""}`}>
          <div key={hitKey} className={`boss-body ${hitKey ? "hit" : ""}`}>
            {boss && <Portrait ch={boss} className="boss-img" key={boss.id} />}
          </div>
          {taunt && (
            <div className="taunt" key={taunt}>
              {taunt}
            </div>
          )}
          {damage && (
            <div key={damage.key} className={`dmg ${damage.perfect ? "perfect" : ""}`}>
              {damage.perfect && <span className="dmg-tag">{t("perfect")}</span>}-{damage.amount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
