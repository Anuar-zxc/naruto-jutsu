"use client";

import { useGame } from "@/hooks/useGame";
import { comboMultiplier } from "@/lib/game/combo";
import { CHARACTERS } from "@/lib/game/characters";

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  debug: boolean;
  onToggleDebug: () => void;
  onQuit: () => void;
}

export function GameHUD({ muted, onToggleMute, debug, onToggleDebug, onQuit }: Props) {
  const g = useGame();
  const mult = comboMultiplier(g.stats.combo);
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  return (
    <header className="hud">
      <button className="hud-logo" onClick={onQuit} title="Back to title">
        <span className="logo-kanji">忍術</span>
        <span className="logo-text">SHINOBI</span>
      </button>
      {hero && (
        <div className="hud-hero" style={{ ["--hero" as string]: hero.color }} title={hero.perk}>
          <img src={hero.image} alt="" />
          <div>
            <b>{hero.name.toUpperCase()}</b>
            <span>{hero.perk}</span>
          </div>
        </div>
      )}
      <div className="hud-stats">
        <div className="hud-stat">
          <span className="hud-k">ROUND</span>
          <span className="hud-v">{g.round}</span>
        </div>
        <div className="hud-stat">
          <span className="hud-k">SCORE</span>
          <span className="hud-v" key={g.stats.score}>
            {g.stats.score.toLocaleString("en-US")}
          </span>
        </div>
        <div className={`hud-stat combo ${mult > 1 ? "hot" : ""}`}>
          <span className="hud-k">COMBO</span>
          <span className="hud-v" key={`c${g.stats.combo}`}>
            {g.stats.combo}
            {mult > 1 && <em>×{mult}</em>}
          </span>
        </div>
      </div>
      <div className="hud-actions">
        <button className={`icon-btn ${debug ? "on" : ""}`} onClick={onToggleDebug} title="Vision debug overlay (D)">
          ◉
        </button>
        <button className="icon-btn" onClick={onToggleMute} title={muted ? "Unmute (M)" : "Mute (M)"} aria-label={muted ? "Unmute" : "Mute"}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>
    </header>
  );
}
