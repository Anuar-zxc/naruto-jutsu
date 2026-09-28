"use client";

import { forwardRef } from "react";
import { CHARACTERS, type CharacterId } from "@/lib/game/characters";
import { HealthBar } from "./HealthBar";
import { ArenaBackdrop } from "./ArenaBackdrop";

interface Props {
  bossId: CharacterId | null;
  round: number;
  hp: number;
  maxHp: number;
  /** Changes on each impact → replays the hit animation. */
  hitKey: number;
  damage: { amount: number; perfect: boolean; key: number } | null;
  defeated: boolean;
  hpDelayMs: number;
}

export const Boss = forwardRef<HTMLDivElement, Props>(function Boss({ bossId, round, hp, maxHp, hitKey, damage, defeated, hpDelayMs }, ref) {
  const boss = bossId ? CHARACTERS[bossId] : null;
  return (
    <div className="arena">
      <ArenaBackdrop round={round} />
      <div className="boss-head">
        <div className="boss-name">
          {boss ? boss.name.toUpperCase() : "???"}
          <span className="boss-title">{boss ? boss.title : "Choose your shinobi to reveal the enemy"}</span>
        </div>
        <HealthBar hp={hp} max={maxHp} delayMs={hpDelayMs} />
      </div>
      <div className="arena-stage">
        <div className="arena-floor" />
        <div ref={ref} className={`boss ${defeated ? "defeated" : ""} ${boss ? "" : "unknown"}`}>
          <div key={hitKey} className={`boss-body ${hitKey ? "hit" : ""}`}>
            {boss ? <img className="boss-img" src={boss.image} alt={boss.name} draggable={false} /> : <div className="boss-silhouette">?</div>}
          </div>
          {damage && (
            <div key={damage.key} className={`dmg ${damage.perfect ? "perfect" : ""}`}>
              {damage.perfect && <span className="dmg-tag">PERFECT</span>}-{damage.amount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
