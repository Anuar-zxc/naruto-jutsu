"use client";

import { useGame, useLive, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { SIGN_LIST, SIGNS } from "@/lib/vision/gestureDefinitions";
import { TRAIN_MASTERY } from "@/lib/game/gameState";
import { t, tr } from "@/lib/i18n";
import { HandPictogram } from "./HandPictogram";

/**
 * Dojo side panel: the target seal, a mastery streak, and the full seal board.
 * Coaching (what to fix) is shown on the camera by ErrorFeedback as usual.
 */
export function Dojo() {
  useLang();
  const g = useGame();
  const live = useLive();
  const session = useSession();
  const tr0 = g.training;
  if (!tr0) return null;
  const def = SIGNS[tr0.sign];
  const mastered = new Set([...session.getDojoMastered(), ...tr0.mastered]);
  const done = tr0.streak >= TRAIN_MASTERY;
  const holding = live.hold?.sign === tr0.sign ? live.hold.progress : 0;

  return (
    <div className="dojo">
      <div className="dojo-head">
        <span>{t("dojoHeader")}</span>
        <b>{t("dojoMastered", { m: mastered.size })}</b>
      </div>

      <div className={`dojo-target ${done ? "done" : ""}`} key={tr0.sign}>
        <div className="dojo-kanji">{def.kanji}</div>
        <div className="dojo-info">
          <div className="dojo-name">{tr(def.name).toUpperCase()}</div>
          <div className="dojo-how">{tr(def.howTo)}</div>
          <div className="dojo-streak">
            {Array.from({ length: TRAIN_MASTERY }, (_, i) => (
              <i key={i} className={i < tr0.streak ? "on" : ""} />
            ))}
            <span>{done ? t("dojoDone") : t("dojoStreak", { s: tr0.streak, n: TRAIN_MASTERY })}</span>
          </div>
          <div className="dojo-hold">
            <div style={{ width: `${holding * 100}%` }} />
          </div>
        </div>
        <HandPictogram def={def} size={132} />
      </div>

      <p className="dojo-hint">{t("dojoHint", { n: TRAIN_MASTERY })}</p>

      <div className="dojo-board">
        {SIGN_LIST.map((s) => (
          <button
            key={s.id}
            className={`dojo-cell ${s.id === tr0.sign ? "active" : ""} ${mastered.has(s.id) ? "mastered" : ""}`}
            onClick={() => {
              session.sfx.select();
              session.dispatch({ type: "TRAIN_SELECT", sign: s.id });
            }}
            title={tr(s.howTo)}
            data-sign={s.id}
          >
            <span className="dc-kanji">{s.kanji}</span>
            <span className="dc-name">{tr(s.name)}</span>
            {mastered.has(s.id) && <span className="dc-check">✓</span>}
          </button>
        ))}
      </div>

      <button className="btn ghost dojo-exit" onClick={() => session.dispatch({ type: "BACK_TO_MENU" })}>
        {t("dojoExit")}
      </button>
    </div>
  );
}
