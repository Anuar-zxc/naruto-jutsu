"use client";

import { useGame } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { comboMultiplier } from "@/lib/game/combo";
import { CHARACTERS } from "@/lib/game/characters";
import { t, tr } from "@/lib/i18n";
import { LangToggle } from "./LangToggle";
import { Portrait } from "./Portrait";

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  debug: boolean;
  onToggleDebug: () => void;
  onQuit: () => void;
}

export function GameHUD({ muted, onToggleMute, debug, onToggleDebug, onQuit }: Props) {
  useLang();
  const g = useGame();
  const mult = comboMultiplier(g.stats.combo);
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  return (
    <header className="hud">
      <button className="hud-logo" onClick={onQuit} title={t("backTitle")}>
        <span className="logo-kanji">忍術</span>
        <span className="logo-text">SHINOBI</span>
      </button>
      {hero && (
        <div className="hud-hero" style={{ ["--hero" as string]: hero.color }} title={tr(hero.perk)}>
          <Portrait ch={hero} className="hud-hero-img" />
          <div>
            <b>{tr(hero.name).toUpperCase()}</b>
            <span>{tr(hero.perk)}</span>
          </div>
        </div>
      )}
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
      <div className="hud-actions">
        <LangToggle />
        <button className={`icon-btn ${debug ? "on" : ""}`} onClick={onToggleDebug} title={t("debugTitle")}>
          ◉
        </button>
        <button className="icon-btn" onClick={onToggleMute} title={muted ? t("unmute") : t("mute")} aria-label={muted ? t("unmute") : t("mute")}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </header>
  );
}
