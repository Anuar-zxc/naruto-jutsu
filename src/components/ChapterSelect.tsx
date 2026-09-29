"use client";

import { useSyncExternalStore } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { ARCS, CHAPTERS } from "@/lib/game/story";
import { CHARACTERS, mentorFor } from "@/lib/game/characters";
import { JUTSU } from "@/lib/game/jutsu";
import { LOCATIONS } from "@/lib/game/locations";
import { t, tr } from "@/lib/i18n";
import { Portrait } from "./Portrait";
import { StageScene } from "./StageScenes";

export function ChapterSelect() {
  useLang();
  const session = useSession();
  const g = useGame();
  const progress = useSyncExternalStore(session.subscribeProgress, session.getProgress, () => 0);

  const open = (i: number) => {
    if (i > progress) return;
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "SELECT_CHAPTER", index: i });
  };

  return (
    <div className="select-overlay chapter-overlay">
      <div className="select-title">
        <span>{t("storyTitle")}</span>
        {t("chapters")}
      </div>
      <div className="chapter-arcs">
        {ARCS.map((arc, ai) => (
          <section key={ai} className="chapter-arc">
            <div className="arc-head">
              <span className="arc-kanji">{arc.kanji}</span>
              <span className="arc-title">{tr(arc.title)}</span>
            </div>
      <div className="chapter-grid">
        {CHAPTERS.map((ch, i) => ch.arc !== ai ? null : (() => {
          const loc = LOCATIONS[ch.location];
          const enemyId = ch.enemy === "mentor" ? mentorFor(g.characterId) : ch.enemy;
          const enemy = CHARACTERS[enemyId];
          const locked = i > progress;
          const cleared = i < progress;
          return (
            <button
              key={i}
              className={`chapter-card ${locked ? "locked" : ""} ${cleared ? "cleared" : ""} ${i === progress ? "next" : ""}`}
              onClick={() => open(i)}
              disabled={locked}
              title={locked ? t("locked") : tr(loc.name)}
              data-chapter={i}
              style={{ ["--hero" as string]: enemy.color }}
            >
              <div className="chapter-bg">
                {loc.image ? <div className="chapter-bg-img" style={{ backgroundImage: `url(${loc.image})` }} /> : loc.scene && <StageScene scene={loc.scene} />}
              </div>
              {!locked && <Portrait ch={enemy} className="chapter-enemy" />}
              <div className="chapter-info">
                <div className="chapter-n">{t("chapterN", { n: i + 1 })}</div>
                <div className="chapter-title">{tr(ch.title)}</div>
                <div className="chapter-meta">
                  {locked ? "🔒" : `${tr(enemy.name)} · ${tr(loc.name)}`}
                </div>
                {!locked && ch.unlocks.length > 0 && <div className="chapter-unlock">＋ {ch.unlocks.map((j) => tr(JUTSU[j].name)).join(", ")}</div>}
              </div>
              {cleared && <div className="chapter-badge">{t("cleared")}</div>}
            </button>
          );
        })())}
      </div>
          </section>
        ))}
      </div>
      <div className="chapter-actions">
        <button className="btn ghost small" onClick={() => session.dispatch({ type: "CHANGE_CHARACTER" })}>
          {t("changeShinobi")}
        </button>
        {progress > 0 && (
          <button className="btn ghost small" onClick={() => session.resetProgress()}>
            {t("resetProgress")}
          </button>
        )}
      </div>
    </div>
  );
}
