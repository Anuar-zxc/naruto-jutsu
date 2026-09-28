"use client";

import { useEffect } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { JUTSU, JUTSU_ORDER } from "@/lib/game/jutsu";
import { availableJutsu, timeLimit } from "@/lib/game/gameState";
import { CHARACTERS, damageMultiplier } from "@/lib/game/characters";
import { CHAPTERS } from "@/lib/game/story";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import { t, tr } from "@/lib/i18n";
import type { JutsuId } from "@/types/game";
import { Portrait } from "./Portrait";

export function JutsuSelect() {
  useLang();
  const g = useGame();
  const session = useSession();
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const foe = g.bossId ? CHARACTERS[g.bossId] : null;
  const available = availableJutsu(g);
  const fresh = g.mode === "story" && g.chapter != null ? CHAPTERS[g.chapter].unlocks : [];
  const list = JUTSU_ORDER.filter((id) => available.includes(id));

  const choose = (id: JutsuId) => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "SELECT_JUTSU", id });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (new URLSearchParams(location.search).has("synthetic")) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < list.length) choose(list[i]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="select-overlay jutsu-overlay">
      <div className="select-title">
        <span>
          {t("round")} {g.round}
        </span>
        {hero && foe && (
          <div className="versus">
            <Portrait ch={hero} className="vs-img" />
            <b>{tr(hero.name).toUpperCase()}</b>
            <em>{t("vs")}</em>
            <b>{tr(foe.name).toUpperCase()}</b>
            <Portrait ch={foe} className="vs-img" />
          </div>
        )}
        {t("chooseJutsu")}
      </div>
      <div className={`select-cards n${Math.min(list.length, 9)}`}>
        {list.map((id, i) => {
          const j = JUTSU[id];
          return (
            <button
              key={j.id}
              className={`jutsu-card el-${j.element}`}
              style={{ ["--el" as string]: j.color, ["--el-glow" as string]: j.glow, animationDelay: `${i * 0.04}s` }}
              onClick={() => choose(j.id)}
              data-jutsu={j.id}
            >
              {fresh.includes(id) && <span className="jc-new">NEW</span>}
              <div className="jc-top">
                <div className="jc-kanji">{j.kanji}</div>
                <div className="jc-key">{i + 1}</div>
              </div>
              <div className="jc-name">{tr(j.name)}</div>
              <div className="jc-romaji">{j.romaji}</div>
              <div className="jc-seq">
                {j.sequence.map((s, k) => (
                  <span key={k} title={tr(SIGNS[s].name)}>
                    {SIGNS[s].kanji}
                  </span>
                ))}
              </div>
              {j.note && <div className="jc-note">{tr(j.note)}</div>}
              <div className="jc-meta">
                <span>
                  {t("dmg")} <b>{Math.round(j.damage * damageMultiplier(hero, j.element))}</b>
                </span>
                <span>
                  <b>{Math.round(timeLimit(g, j.timeLimitMs) / 1000)}</b>
                  {t("sec")}
                </span>
                <span className="jc-stars">{"★".repeat(j.difficulty) + "☆".repeat(3 - j.difficulty)}</span>
              </div>
            </button>
          );
        })}
      </div>
      <div className="select-tip">{t("jutsuTip")}</div>
      {g.round === 1 && (
        <div className="chapter-actions">
          {g.mode === "story" ? (
            <button className="btn ghost small" onClick={() => session.dispatch({ type: "BACK_TO_CHAPTERS" })}>
              ← {t("chapters")}
            </button>
          ) : (
            <button className="btn ghost small" onClick={() => session.dispatch({ type: "CHANGE_CHARACTER" })}>
              {t("changeShinobi")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
