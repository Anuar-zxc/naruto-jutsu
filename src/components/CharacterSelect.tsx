"use client";

import { useState } from "react";
import { useSession } from "@/hooks/useGame";
import { CHARACTER_LIST, CHARACTERS, bossFor, type CharacterId } from "@/lib/game/characters";

export function CharacterSelect() {
  const session = useSession();
  const [hover, setHover] = useState<CharacterId>("naruto");
  const h = CHARACTERS[hover];
  const foe = CHARACTERS[bossFor(hover)];

  const choose = (id: CharacterId) => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "SELECT_CHARACTER", id });
  };

  return (
    <div className="select-overlay char-overlay">
      <div className="select-title">
        <span>STEP 1</span>
        CHOOSE YOUR SHINOBI
      </div>
      <div className="char-preview" style={{ ["--hero" as string]: h.color }}>
        <img src={h.image} alt="" className="char-preview-img" key={h.id} />
        <div className="char-preview-info">
          <div className="cp-name">{h.name.toUpperCase()}</div>
          <div className="cp-title">{h.title}</div>
          <div className="cp-perk">{h.perk}</div>
          <div className="cp-vs">
            VS <b>{foe.name.toUpperCase()}</b> · {foe.title}
          </div>
        </div>
      </div>
      <div className="char-grid">
        {CHARACTER_LIST.map((c) => (
          <button
            key={c.id}
            className={`char-card ${hover === c.id ? "active" : ""}`}
            style={{ ["--hero" as string]: c.color }}
            onMouseEnter={() => setHover(c.id)}
            onFocus={() => setHover(c.id)}
            onClick={() => choose(c.id)}
            data-character={c.id}
          >
            <img src={c.image} alt={c.name} loading="eager" draggable={false} />
            <span className="cc-name">{c.name}</span>
            {c.villain && <span className="cc-tag">{c.tag ?? "ROGUE"}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
