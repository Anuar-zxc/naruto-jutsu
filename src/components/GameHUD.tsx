"use client";

import { useGame } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { comboMultiplier } from "@/lib/game/combo";
import { CHARACTERS } from "@/lib/game/characters";
import { t, tr } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { Portrait } from "./Portrait";
import { useState, useSyncExternalStore } from "react";
import { handControl } from "@/lib/vision/handPointer";

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
  debug: boolean;
  onToggleDebug: () => void;
  onQuit: () => void;
}

export function GameHUD({ muted, onToggleMute, musicOn, onToggleMusic, debug, onToggleDebug, onQuit }: Props) {
  useLang();
  const g = useGame();
  const mult = comboMultiplier(g.stats.combo);
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const hand = useSyncExternalStore(handControl.subscribe, handControl.isOn, () => false);
  const [toast, setToast] = useState<{ text: string; key: number } | null>(null);
  return (
    <header className="hud">
      <button className="hud-logo" onClick={onQuit} title={t("backTitle")}>
        <span className="logo-kanji">忍術</span>
        <span className="logo-text">NARUTO</span>
      </button>
      {hero && (
        <div className="hud-hero" style={{ ["--hero" as string]: hero.color }} title={tr(hero.perk)}>
          <Portrait ch={hero} className="hud-hero-img" />
          <div>
            <b>{tr(hero.name).toUpperCase()}</b>
            {g.mode !== "training" && (
              <div className={`player-hp ${g.playerHp / g.playerMaxHp <= 0.34 ? "low" : ""}`} title={t("yourHp")} data-hp={g.playerHp}>
                <div className="player-hp-fill" style={{ width: `${(g.playerHp / g.playerMaxHp) * 100}%` }} />
                <span>{t("yourHp")} {g.playerHp}</span>
              </div>
            )}
            <span>{tr(hero.perk)}</span>
          </div>
        </div>
      )}
      {g.mode !== "training" && (
      <div className="hud-stats">
        <div className="hud-stat">
          <span className="hud-k">{t("round")}</span>
          <span className="hud-v">{g.round}</span>
        </div>
        <div className="hud-stat">
          <span className="hud-k">{t("score")}</span>
          <span className="hud-v" key={g.stats.score}>
            {g.stats.score.toLocaleString("en-US")}
          </span>
        </div>
        <div className={`hud-stat combo ${mult > 1 ? "hot" : ""}`}>
          <span className="hud-k">{t("combo")}</span>
          <span className="hud-v" key={`c${g.stats.combo}`}>
            {g.stats.combo}
            {mult > 1 && <em>×{mult}</em>}
          </span>
        </div>
      </div>
      )}
      <div className="hud-actions">
        <LangToggle />
        <button
          className={`icon-btn hand-btn ${hand ? "on-gold" : "off"}`}
          onClick={() => {
            handControl.set(!hand);
            setToast({ text: t(!hand ? "handCursorOn" : "handCursorOff"), key: Date.now() });
          }}
          title={t("handCursor")}
          aria-label={t("handCursor")}
          data-action="hand-control"
        >
          ☝
        </button>
        {toast && (
          <span className="hud-toast" key={toast.key}>
            {toast.text}
          </span>
        )}
        <button className={`icon-btn ${debug ? "on" : ""}`} onClick={onToggleDebug} title={t("debugTitle")}>
          ◉
        </button>
        <button className={`icon-btn ${musicOn && !muted ? "on-gold" : "off"}`} onClick={onToggleMusic} title={t("musicTitle")} aria-label={t("musicTitle")}>
          ♪
        </button>
        <button className="icon-btn" onClick={onToggleMute} title={muted ? t("unmute") : t("mute")} aria-label={muted ? t("unmute") : t("mute")}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </header>
  );
}
