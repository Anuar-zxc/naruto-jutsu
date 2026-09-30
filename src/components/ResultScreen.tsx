"use client";

import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { accuracy, rankFor, rankPoints } from "@/lib/game/scoring";
import { CHARACTERS } from "@/lib/game/characters";
import { CHAPTERS } from "@/lib/game/story";
import { t, tr, type StrKey } from "@/lib/i18n";
import { Portrait } from "./Portrait";
import { SenseiReview } from "./SenseiReview";
import { ShareCard } from "./ShareCard";
import { useEffect, useState } from "react";
import { askSensei, tauntRequest } from "@/lib/ai/sensei";

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
    ["rowHpLeft", `${g.playerHp} / ${g.playerMaxHp}`],
  ];
  const rec = session.lastRecord;
  return (
    <div className="result">
      {hero && <Portrait ch={hero} className="result-hero" />}
      <div className="result-card">
        <div className="result-head">{t("victory")}</div>
        {story && <div className="result-chapter">{t("chapterN", { n: g.chapter! + 1 })} · {tr(CHAPTERS[g.chapter!].title)}</div>}
        <div className="result-sub">
          {g.mode === "duel"
            ? session.getDuel().forfeit
              ? t("forfeit")
              : t("duelWin", { nick: g.duel?.opponentNick ?? "?" })
            : foe && hero
              ? t("defeatedBy", { foe: tr(foe.name), hero: tr(hero.name) })
              : ""}
        </div>
        {session.lastReward != null && (
          <div className="reward-line" data-reward={session.lastReward}>
            <span className="purse-coin">両</span> {t("rewardLine", { n: session.lastReward })}
          </div>
        )}
        <XpLine />
        <div className={`rank rank-${rank}`}>{rank}</div>
        {rec?.isNew ? (
          <div className="new-record">★ {t("newRecord")} ★</div>
        ) : rec?.best ? (
          <div className="record-line">{t("bestScore", { n: rec.best.score.toLocaleString("en-US") })}</div>
        ) : null}
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
        <SenseiReview outcome="victory" />
        <div className="result-actions">
          {story ? (
            <button className="btn primary" onClick={() => session.dispatch({ type: "STORY_OUTRO" })} data-action="continue">
              {last ? t("theEnd") : t("continueStory")}
            </button>
          ) : g.mode === "duel" ? (
            <button
              className="btn primary"
              onClick={() => {
                session.leaveRoom();
                session.dispatch({ type: "BACK_TO_MENU" });
              }}
            >
              {t("toMenu")}
            </button>
          ) : (
            <button className="btn primary" onClick={() => session.dispatch({ type: "RESTART" })}>
              {t("fightAgain")}
            </button>
          )}
          <ShareCard win />
          <button className="btn ghost" onClick={onExit}>
            {t("exit")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** "+120 XP" and any levels gained. */
export function XpLine() {
  useLang();
  const session = useSession();
  const x = session.lastXp;
  if (!x || !x.gained) return null;
  return (
    <div className="xp-line" data-xp={x.gained}>
      <span className="xp-gain">+{x.gained} XP</span>
      {x.levelUps.map((u) => (
        <span key={u.level} className="xp-lvl">
          ▲ {t("levelShort")} {u.level}
        </span>
      ))}
    </div>
  );
}

export function FailedPanel() {
  useLang();
  const session = useSession();
  const g = useGame();
  const foe = g.bossId ? tr(CHARACTERS[g.bossId].name) : "?";
  const [line, setLine] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void askSensei(tauntRequest(g, "failed"), 6000).then((r) => alive && setLine(r));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="modal modal-delayed">
      <div className="modal-card failed">
        <div className="failed-kanji">失</div>
        <div className="failed-title">{t("jutsuFailed")}</div>
        <div className="failed-sub">{t("failedSub")}</div>
        {g.lastEnemyHit && (
          <div className="failed-strike">
            <b>{t("enemyStrikes", { foe, n: g.lastEnemyHit.amount })}</b>
            <span>{t("hpLeft", { hp: g.playerHp, max: g.playerMaxHp })}</span>
          </div>
        )}
        {line && (
          <div className="villain-line">
            {g.bossId && <Portrait ch={CHARACTERS[g.bossId]} className="vl-img" />}
            <p>
              <b>{foe}:</b> «{line}» <em className="ai-badge">alem.ai</em>
            </p>
          </div>
        )}
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

export function DefeatPanel({ onExit }: { onExit: () => void }) {
  useLang();
  const session = useSession();
  const g = useGame();
  const foe = g.bossId ? CHARACTERS[g.bossId] : null;
  const story = g.mode === "story";
  const survival = g.mode === "survival" ? session.lastSurvival : null;
  return (
    <div className="result defeat">
      {foe && <Portrait ch={foe} className="result-hero defeat-foe" />}
      <div className="result-card defeat-card">
        <div className="defeat-kanji">敗</div>
        <div className="result-head">{t("defeat")}</div>
        <div className="result-sub">{g.mode === "duel" ? t("duelLose", { nick: g.duel?.opponentNick ?? "?" }) : survival ? t("survivalOver", { n: g.survival?.wave ?? 1 }) : t("defeatSub", { foe: foe ? tr(foe.name) : "?" })}</div>
        {survival && (
          <div className="survival-sum">
            {survival.isNew && <div className="sv-new">{t("survivalNewBest")}</div>}
            <div className="sv-waves">
              <b>{survival.waves}</b>
              <span>{t("wave")}</span>
            </div>
            <div className="sv-line">{t("survivalStats", { w: survival.waves, r: survival.earned })}</div>
            {!survival.isNew && <div className="sv-line dim">{t("survivalBestLine", { n: session.getSurvivalBest().wave })}</div>}
          </div>
        )}
        {session.lastReward != null && !survival && (
          <div className="reward-line">
            <span className="purse-coin">両</span> {t("rewardLine", { n: session.lastReward })}
          </div>
        )}
        <XpLine />
        <SenseiReview outcome="defeat" />
        <div className="defeat-tip">{t("defeatTip")}</div>
        <div className="result-actions">
          {g.mode !== "duel" && (
            <button className="btn primary" onClick={() => session.dispatch({ type: "RESTART" })} data-action="rematch">
              {survival ? t("survivalAgain") : t("tryFightAgain")}
            </button>
          )}
          {story ? (
            <button className="btn ghost" onClick={() => session.dispatch({ type: "BACK_TO_CHAPTERS" })}>
              {t("toChapters")}
            </button>
          ) : (
            <button
              className="btn ghost"
              onClick={() => {
                session.leaveRoom();
                session.dispatch({ type: "BACK_TO_MENU" });
              }}
            >
              {t("toMenu")}
            </button>
          )}
          {g.mode !== "duel" && <ShareCard win={false} />}
          <button className="btn ghost" onClick={onExit}>
            {t("exit")}
          </button>
        </div>
      </div>
    </div>
  );
}
