"use client";

import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { accuracy, rankFor, rankPoints } from "@/lib/game/scoring";
import { CHARACTERS } from "@/lib/game/characters";
import { CHAPTERS } from "@/lib/game/story";
import { t, tr, type StrKey } from "@/lib/i18n";
import { Portrait } from "./Portrait";

export function ResultScreen({ onExit }: { onExit: () => void }) {
  useLang();
  const g = useGame();
  const session = useSession();
  const s = g.stats;
  const rank = rankFor(s);
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const foe = g.bossId ? CHARACTERS[g.bossId] : null;
  const story = g.mode === "story" && g.chapter != null;
  const last = story && g.chapter === CHAPTERS.length - 1;
  const rows: [StrKey, string][] = [
    ["rowScore", s.score.toLocaleString("en-US")],
    ["rowAccuracy", `${Math.round(accuracy(s) * 100)}%`],
    ["rowMaxCombo", `${s.maxCombo}`],
    ["rowSealTime", `${(s.playMs / 1000).toFixed(1)}s`],
    ["rowCast", `${s.castCount}${s.perfectCount ? ` (${t("perfectCount", { n: s.perfectCount })})` : ""}`],
    ["rowMistakes", `${s.mistakes}`],
  ];
  return (
    <div className="result">
      {hero && <Portrait ch={hero} className="result-hero" />}
      <div className="result-card">
        <div className="result-head">{t("victory")}</div>
        {story && <div className="result-chapter">{t("chapterN", { n: g.chapter! + 1 })} · {tr(CHAPTERS[g.chapter!].title)}</div>}
        <div className="result-sub">{foe && hero ? t("defeatedBy", { foe: tr(foe.name), hero: tr(hero.name) }) : ""}</div>
        <div className={`rank rank-${rank}`}>{rank}</div>
        <div className="rank-text">
          {t(`rank${rank}`)} · {rankPoints(s)} {t("pts")}
        </div>
        <div className="result-grid">
          {rows.map(([k, v]) => (
            <div key={k} className="result-row">
              <span>{t(k)}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <div className="result-actions">
          {story ? (
            <button className="btn primary" onClick={() => session.dispatch({ type: "STORY_OUTRO" })} data-action="continue">
              {last ? t("theEnd") : t("continueStory")}
            </button>
          ) : (
            <button className="btn primary" onClick={() => session.dispatch({ type: "RESTART" })}>
              {t("fightAgain")}
            </button>
          )}
          <button className="btn ghost" onClick={onExit}>
            {t("exit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FailedPanel() {
  useLang();
  const session = useSession();
  return (
    <div className="modal">
      <div className="modal-card failed">
        <div className="failed-kanji">失</div>
        <div className="failed-title">{t("jutsuFailed")}</div>
        <div className="failed-sub">{t("failedSub")}</div>
        <div className="result-actions">
          <button className="btn primary" onClick={() => session.dispatch({ type: "RETRY" })}>
            {t("retry")}
          </button>
          <button className="btn ghost" onClick={() => session.dispatch({ type: "BACK_TO_SELECTION" })}>
            {t("chooseAnother")}
          </button>
        </div>
      </div>
    </div>
  );
}
