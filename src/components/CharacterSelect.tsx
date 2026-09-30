"use client";

import { useState } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { CHARACTERS, PLAYABLE, bossFor, randomBossFor, type CharacterId } from "@/lib/game/characters";
import { t, tr } from "@/lib/i18n";
import { Portrait } from "./Portrait";

export function CharacterSelect() {
  useLang();
  const session = useSession();
  const g = useGame();
  const [hover, setHover] = useState<CharacterId>("naruto-six-paths");
  const h = CHARACTERS[hover];
  const foe = g.mode === "quick" || g.mode === "survival" ? CHARACTERS[bossFor(hover)] : null;

  const choose = (id: CharacterId) => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "SELECT_CHARACTER", id, bossId: g.mode === "quick" || g.mode === "survival" ? randomBossFor(id) : undefined });
  };

  const half = Math.ceil(PLAYABLE.length / 2);
  const card = (c: (typeof PLAYABLE)[number]) => (
    <button
      key={c.id}
      className={`char-card ${hover === c.id ? "active" : ""}`}
      style={{ ["--hero" as string]: c.color }}
      onMouseEnter={() => setHover(c.id)}
      onFocus={() => setHover(c.id)}
      onClick={() => choose(c.id)}
      data-character={c.id}
    >
      <Portrait ch={c} className="char-card-img" lazy />
      <span className="cc-name">{tr(c.name)}</span>
      {c.tag && <span className={`cc-tag ${c.villain ? "rogue" : ""}`}>{tr(c.tag)}</span>}
    </button>
  );

  return (
    <div className="select-overlay char-overlay char-wall-overlay">
      <div className="select-title">
        <span>{t("step1Label")}</span>
        {t("chooseShinobi")}
      </div>
      {/* Fighting-game select: roster on both sides, the chosen fighter in the middle — everyone on one screen. */}
      <div className="char-wall">
        <div className="char-grid char-side left">{PLAYABLE.slice(0, half).map(card)}</div>
        <div className="char-preview char-center" style={{ ["--hero" as string]: h.color }}>
          <Portrait ch={h} className="char-preview-img" key={h.id} />
          <div className="char-preview-info">
            <div className="cp-name">{tr(h.name).toUpperCase()}</div>
            <div className="cp-title">{tr(h.title)}</div>
            <div className="cp-perk">{tr(h.perk)}</div>
            {foe && (
              <div className="cp-vs">
                {t("vs")} <b>?</b>
              </div>
            )}
          </div>
        </div>
        <div className="char-grid char-side right">{PLAYABLE.slice(half).map(card)}</div>
      </div>
      <button className="btn ghost small" onClick={() => session.dispatch({ type: "BACK_TO_MENU" })}>
        {t("backToMenu")}
      </button>
    </div>
  );
}
