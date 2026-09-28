"use client";

import { useEffect } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { JUTSU_LIST } from "@/lib/game/jutsu";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import type { JutsuId } from "@/types/game";

export function JutsuSelect() {
  const g = useGame();
  const session = useSession();

  const choose = (id: JutsuId) => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "SELECT_JUTSU", id });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const i = ["1", "2", "3"].indexOf(e.key);
      if (i >= 0 && !new URLSearchParams(location.search).has("synthetic")) choose(JUTSU_LIST[i].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="select-overlay">
      <div className="select-title">
        <span>ROUND {g.round}</span>
        CHOOSE YOUR JUTSU
      </div>
      <div className="select-cards">
        {JUTSU_LIST.map((j) => (
          <button
            key={j.id}
            className={`jutsu-card el-${j.element}`}
            style={{ ["--el" as string]: j.color, ["--el-glow" as string]: j.glow }}
            onClick={() => choose(j.id)}
            data-jutsu={j.id}
          >
            <div className="jc-kanji">{j.kanji}</div>
            <div className="jc-style">{j.style.toUpperCase()}</div>
            <div className="jc-name">{j.name}</div>
            <div className="jc-seq">
              {j.sequence.map((s, i) => (
                <span key={i} title={SIGNS[s].name}>
                  {SIGNS[s].kanji}
                </span>
              ))}
            </div>
            <div className="jc-meta">
              <span>
                DMG <b>{j.damage}</b>
              </span>
              <span>
                <b>{j.timeLimitMs / 1000}</b>s
              </span>
              <span className="jc-stars">{"★".repeat(j.difficulty) + "☆".repeat(3 - j.difficulty)}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="select-tip">Perform every seal before the timer runs out. No mistakes = PERFECT JUTSU (+25% damage).</div>
    </div>
  );
}
