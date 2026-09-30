"use client";

import { useEffect } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { JUTSU, JUTSU_ORDER } from "@/lib/game/jutsu";
import { availableJutsu, loadoutSize, timeLimit } from "@/lib/game/gameState";
import { CHARACTERS, damageMultiplier } from "@/lib/game/characters";
import { CHAPTERS } from "@/lib/game/story";
import { EFFECT_ICON, effectText } from "@/lib/game/effects";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import { t, tr } from "@/lib/i18n";
import type { JutsuId } from "@/types/game";
import { Portrait } from "./Portrait";
import { useDuel } from "@/hooks/useProfile";
import { MUTATORS } from "@/lib/game/mutators";

/**
 * Loadout screen — shown ONCE at the start of a fight. The player picks three
 * jutsu; the rounds then rotate through them with no selection in between.
 */
export function JutsuSelect() {
  useLang();
  const g = useGame();
  const session = useSession();
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const foe = g.bossId ? CHARACTERS[g.bossId] : null;
  const available = availableJutsu(g);
  const fresh = g.mode === "story" && g.chapter != null ? CHAPTERS[g.chapter].unlocks : [];
  const list = JUTSU_ORDER.filter((id) => available.includes(id));
  const duelUi = useDuel();
  const duel = g.mode === "duel";
  const waiting = duel && !!g.duel?.ready;
  const need = loadoutSize(g);
  const ready = g.loadout.length === need;

  const toggle = (id: JutsuId) => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "TOGGLE_LOADOUT", id });
  };
  const confirm = () => {
    if (!ready || waiting) return;
    session.sfx.detected();
    session.dispatch({ type: "CONFIRM_LOADOUT" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") return confirm();
      if (new URLSearchParams(location.search).has("synthetic")) return;
      const i = e.key === "0" ? 9 : Number(e.key) - 1;
      if (i >= 0 && i < list.length) toggle(list[i]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="select-overlay jutsu-overlay loadout-overlay">
      <div className="select-title">
        {hero && foe && (
          <div className="versus">
            <Portrait ch={hero} className="vs-img" />
            <b>{tr(hero.name).toUpperCase()}</b>
            <em>{t("vs")}</em>
            <b>{duel && g.duel ? g.duel.opponentNick.toUpperCase() : tr(foe.name).toUpperCase()}</b>
            <Portrait ch={foe} className="vs-img" />
          </div>
        )}
        {need === 3 ? t("loadoutTitle") : t("loadoutTitleN", { n: need })}
        {g.mutators.length > 0 && (
          <div className="loadout-mods">
            {t("modsLabel")}:{" "}
            {g.mutators.map((id) => (
              <span key={id}>
                <b>{MUTATORS[id].kanji}</b> {tr(MUTATORS[id].name)} — {tr(MUTATORS[id].desc)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="loadout-slots">
        {Array.from({ length: need }, (_, i) => {
          const id = g.loadout[i];
          const j = id ? JUTSU[id] : null;
          return (
            <button key={i} className={`loadout-slot ${j ? "filled" : ""}`} style={j ? { ["--el" as string]: j.color, ["--el-glow" as string]: j.glow } : undefined} onClick={() => j && toggle(j.id)} data-slot={i}>
              <span className="ls-n">{i + 1}</span>
              {j ? (
                <>
                  <span className="ls-kanji">{j.kanji}</span>
                  <span className="ls-name">{tr(j.name)}</span>
                </>
              ) : (
                <span className="ls-empty">—</span>
              )}
            </button>
          );
        })}
        <button className="btn primary loadout-go" onClick={confirm} disabled={!ready || waiting} data-action="to-battle">
          {waiting ? t("waitingOpponent") : t("toBattle")}
        </button>
        {duel && <span className={`duel-status ${duelUi.opponentReady ? "ok" : ""}`}>{duelUi.opponentReady ? `✓ ${t("opponentReady")}` : `… ${t("opponentPicking")}`}</span>}
      </div>

      <div className={`select-cards n${Math.min(list.length, 12)}`}>
        {list.map((id, i) => {
          const j = JUTSU[id];
          const at = g.loadout.indexOf(id);
          const full = !ready || at >= 0 ? "" : "dim";
          return (
            <button
              key={j.id}
              className={`jutsu-card el-${j.element} ${at >= 0 ? "picked" : ""} ${full}`}
              style={{ ["--el" as string]: j.color, ["--el-glow" as string]: j.glow, animationDelay: `${i * 0.03}s` }}
              onClick={() => toggle(j.id)}
              data-jutsu={j.id}
            >
              {fresh.includes(id) && <span className="jc-new">NEW</span>}
              {at >= 0 && <span className="jc-pick">{at + 1}</span>}
              <div className="jc-top">
                <div className="jc-kanji">{j.kanji}</div>
                <div className="jc-key">{i < 10 ? (i + 1) % 10 : ""}</div>
              </div>
              <div className="jc-name">{tr(j.name)}</div>
              <div className="jc-romaji">{j.romaji}</div>
              <div className="jc-effect">
                <span>{EFFECT_ICON[j.effect.kind]}</span> {effectText(j)}
              </div>
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
      <div className="select-tip">{t("loadoutTip")}</div>
      <div className="chapter-actions">
        {duel ? (
          <button
            className="btn ghost small"
            onClick={() => {
              session.leaveRoom();
              session.dispatch({ type: "BACK_TO_MENU" });
            }}
          >
            {t("back")}
          </button>
        ) : g.mode === "story" ? (
          <button className="btn ghost small" onClick={() => session.dispatch({ type: "BACK_TO_CHAPTERS" })}>
            ← {t("chapters")}
          </button>
        ) : (
          <button className="btn ghost small" onClick={() => session.dispatch({ type: "CHANGE_CHARACTER" })}>
            {t("changeShinobi")}
          </button>
        )}
      </div>
    </div>
  );
}
