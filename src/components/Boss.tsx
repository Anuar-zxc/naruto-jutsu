"use client";

import { forwardRef } from "react";
import { BOSS } from "@/lib/game/jutsu";
import { HealthBar } from "./HealthBar";
import { ArenaBackdrop, STAGE_NAMES, type Stage } from "./ArenaBackdrop";

interface Props {
  hp: number;
  maxHp: number;
  /** Changes on each impact → replays the hit animation. */
  hitKey: number;
  damage: { amount: number; perfect: boolean; key: number } | null;
  defeated: boolean;
  hpDelayMs: number;
  stage: Stage;
}

/** KAGE-ONI — an original shadow-demon design drawn in SVG. */
export const Boss = forwardRef<HTMLDivElement, Props>(function Boss({ hp, maxHp, hitKey, damage, defeated, hpDelayMs, stage }, ref) {
  return (
    <div className="arena">
      <ArenaBackdrop key={stage} stage={stage} />
      <div className="stage-name">{STAGE_NAMES[stage]}</div>
      <div className="boss-head">
        <div className="boss-name">
          <span className="boss-kanji">{BOSS.kanji}</span>
          {BOSS.name}
          <span className="boss-title">{BOSS.title}</span>
        </div>
        <HealthBar hp={hp} max={maxHp} delayMs={hpDelayMs} />
      </div>
      <div className="arena-stage">
        <div className="arena-floor" />
        <div ref={ref} className={`boss ${defeated ? "defeated" : ""}`}>
          <div key={hitKey} className={`boss-body ${hitKey ? "hit" : ""}`}>
            <BossSvg />
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

function BossSvg() {
  return (
    <svg viewBox="0 0 240 280" className="boss-svg" aria-label="Shadow demon">
      <defs>
        <radialGradient id="aura" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#5a0b2b" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="cloak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a0f1f" />
          <stop offset="55%" stopColor="#12060d" />
          <stop offset="100%" stopColor="#12060d" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mask" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5c1020" />
          <stop offset="100%" stopColor="#240710" />
        </linearGradient>
        <linearGradient id="horn" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#3a1a1a" />
          <stop offset="100%" stopColor="#d9c7b0" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="120" cy="130" rx="118" ry="130" fill="url(#aura)" className="boss-aura" />
      {/* cloak with tattered hem */}
      <path
        d="M120 58 C 60 70 40 130 46 190 C 50 220 44 250 38 270 L 58 256 L 66 276 L 84 254 L 96 278 L 110 256 L 122 280 L 134 256 L 148 278 L 158 254 L 176 276 L 184 256 L 204 270 C 196 250 190 220 194 190 C 200 130 180 70 120 58 Z"
        fill="url(#cloak)"
      />
      {/* shoulder spikes */}
      <path d="M58 118 L 30 104 L 62 132 Z M182 118 L 210 104 L 178 132 Z" fill="#1c0912" />
      {/* horns */}
      <path d="M92 70 C 78 48 70 26 76 4 C 90 26 100 44 106 64 Z" fill="url(#horn)" />
      <path d="M148 70 C 162 48 170 26 164 4 C 150 26 140 44 134 64 Z" fill="url(#horn)" />
      {/* mask */}
      <path d="M120 54 C 92 56 80 76 82 104 C 84 128 100 148 120 156 C 140 148 156 128 158 104 C 160 76 148 56 120 54 Z" fill="url(#mask)" stroke="#8a1c2c" strokeWidth="1.5" />
      <path d="M120 60 L 118 84 L 123 96 L 120 112" stroke="#16040a" strokeWidth="1.6" fill="none" opacity="0.8" />
      {/* brow ridges */}
      <path d="M88 90 L 112 98 L 110 102 L 90 96 Z M152 90 L 128 98 L 130 102 L 150 96 Z" fill="#16040a" />
      {/* eyes */}
      <g filter="url(#glow)" className="boss-eyes">
        <path d="M92 100 L 112 106 L 94 110 Z" fill="#ffb020" />
        <path d="M148 100 L 128 106 L 146 110 Z" fill="#ffb020" />
      </g>
      {/* mouth */}
      <path d="M100 128 L 106 134 L 112 128 L 118 136 L 124 128 L 130 136 L 136 128 L 140 132" stroke="#ff4d4d" strokeWidth="2" fill="none" filter="url(#glow)" opacity="0.85" />
      {/* core */}
      <circle cx="120" cy="196" r="10" fill="#ff2d55" filter="url(#glow)" className="boss-core" />
    </svg>
  );
}
