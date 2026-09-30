"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import type { RecognitionFrame, SignId } from "@/types/gestures";
import { ALL_FINGERS } from "@/types/gestures";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import { t, tr } from "@/lib/i18n";

const FINGER_RU: Record<string, string> = { thumb: "большой", index: "указат.", middle: "средний", ring: "безым.", pinky: "мизинец" };

/**
 * "How it works" — the recognition pipeline, live, for the jury:
 * camera → MediaPipe (21 landmarks per hand) → hand features → seal scores →
 * temporal hold → the game. The camera column shows the skeleton meanwhile.
 */
export function Lab({ frameRef }: { frameRef: RefObject<RecognitionFrame | null> }) {
  const lang = useLang();
  const session = useSession();
  const [f, setF] = useState<RecognitionFrame | null>(null);
  const [accepted, setAccepted] = useState<{ sign: SignId; key: number }[]>([]);
  const lastT = useRef(0);
  const lastSign = useRef<SignId | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const fr = frameRef.current;
      if (!fr || fr.features.t === lastT.current) return;
      lastT.current = fr.features.t;
      setF(fr);
      // The accept event lives on a single frame; sampling may miss it, so a completed hold counts too.
      const done = fr.accepted ?? (fr.hold && fr.hold.progress >= 1 ? fr.hold.sign : null);
      if (!fr.hold && !fr.accepted) lastSign.current = null;
      if (done && done !== lastSign.current) {
        lastSign.current = done;
        const sign = done;
        session.sfx.confirm(0);
        setAccepted((a) => [{ sign, key: Date.now() }, ...a].slice(0, 8));
      }
    }, 90);
    return () => clearInterval(id);
  }, [frameRef, session]);

  const hands = f?.features.hands ?? [];
  const top = (f?.scores ?? []).slice(0, 5);

  return (
    <div className="lab">
      <header className="lab-head">
        <span className="lab-kanji">技術</span>
        <div>
          <b>{t("labTitle")}</b>
          <em>{t("labSub")}</em>
        </div>
      </header>

      <ol className="lab-pipe">
        <li className={f ? "on" : ""}>
          <span className="lp-n">1</span>
          <div>
            <b>{t("labCam")}</b>
            <em>{f ? `${f.fps.toFixed(0)} FPS · ${t("labLocal")}` : t("labWaiting")}</em>
          </div>
        </li>
        <li className={hands.length ? "on" : ""}>
          <span className="lp-n">2</span>
          <div>
            <b>MediaPipe Hands</b>
            <em>{t("labPoints", { h: hands.length, p: hands.length * 21 })}</em>
          </div>
        </li>
        <li className={hands.length ? "on" : ""}>
          <span className="lp-n">3</span>
          <div className="lab-wide">
            <b>{t("labFeatures")}</b>
            <div className="lab-hands">
              {hands.length === 0 && <em>{t("labShowHands")}</em>}
              {hands.map((h) => (
                <div key={h.side} className="lab-hand">
                  <div className="lh-top">
                    <b>{h.side === "left" ? t("labLeft") : t("labRight")}</b>
                    <span className="lh-dial" style={{ ["--a" as string]: `${h.pointing}deg` }} title={`${h.pointing.toFixed(0)}°`}>
                      <i />
                    </span>
                    <em>{h.pointing.toFixed(0)}°</em>
                  </div>
                  {ALL_FINGERS.map((k) => (
                    <div key={k} className="lh-row">
                      <span>{lang === "ru" ? FINGER_RU[k] : k}</span>
                      <div className="lh-bar">
                        <i style={{ width: `${h.ext[k] * 100}%` }} className={h.ext[k] > 0.6 ? "ext" : h.ext[k] < 0.35 ? "curl" : ""} />
                      </div>
                      <em>{h.ext[k].toFixed(2)}</em>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {f?.features.handDistance != null && <em className="lab-dist">{t("labDistance", { d: f.features.handDistance.toFixed(2) })}</em>}
          </div>
        </li>
        <li className={top.length ? "on" : ""}>
          <span className="lp-n">4</span>
          <div className="lab-wide">
            <b>{t("labClassifier")}</b>
            <div className="lab-scores">
              {top.map((s) => (
                <div key={s.sign} className={`ls-row ${s.confidence >= SIGNS[s.sign].threshold ? "pass" : ""}`}>
                  <span className="ls-kanji">{SIGNS[s.sign].kanji}</span>
                  <span className="ls-name">{tr(SIGNS[s.sign].name)}</span>
                  <div className="ls-bar">
                    <i style={{ width: `${Math.round(s.confidence * 100)}%` }} />
                    <u style={{ left: `${SIGNS[s.sign].threshold * 100}%` }} />
                  </div>
                  <em>{Math.round(s.confidence * 100)}%</em>
                </div>
              ))}
            </div>
          </div>
        </li>
        <li className={f?.hold ? "on" : ""}>
          <span className="lp-n">5</span>
          <div className="lab-wide">
            <b>{t("labHold")}</b>
            <div className="lab-hold">
              <span>{f?.hold ? `${SIGNS[f.hold.sign].kanji} ${tr(SIGNS[f.hold.sign].name)}` : "—"}</span>
              <div className="lh-bar big">
                <i style={{ width: `${(f?.hold?.progress ?? 0) * 100}%` }} />
              </div>
            </div>
          </div>
        </li>
        <li className={accepted.length ? "on" : ""}>
          <span className="lp-n">6</span>
          <div className="lab-wide">
            <b>{t("labGame")}</b>
            <div className="lab-accepted">
              {accepted.length === 0 && <em>{t("labNone")}</em>}
              {accepted.map((a, i) => (
                <span key={a.key} className={i === 0 ? "fresh" : ""}>
                  {SIGNS[a.sign].kanji}
                </span>
              ))}
            </div>
          </div>
        </li>
      </ol>
      <p className="lab-note">{t("labNote")}</p>
      <button className="btn ghost small" onClick={() => session.dispatch({ type: "BACK_TO_MENU" })} data-action="lab-back">
        {t("backToMenu")}
      </button>
    </div>
  );
}
