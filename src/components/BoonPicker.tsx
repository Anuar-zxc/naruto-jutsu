"use client";

import { useEffect } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { BOONS } from "@/lib/game/mutators";
import { t, tr } from "@/lib/i18n";

/** Survival: after a wave, pick one of three boons for the rest of the run. */
export function BoonPicker() {
  useLang();
  const g = useGame();
  const session = useSession();
  const offer = g.survival?.offer;
  useEffect(() => {
    if (!offer) return;
    const onKey = (e: KeyboardEvent) => {
      const i = Number(e.key) - 1;
      if (i >= 0 && i < offer.length) session.dispatch({ type: "PICK_BOON", id: offer[i] });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [offer, session]);
  if (g.phase !== "WAVE_CLEAR" || !offer) return null;
  return (
    <div className="boon-picker">
      <div className="bp-title">{t("boonTitle")}</div>
      <div className="bp-cards">
        {offer.map((id, i) => {
          const b = BOONS[id];
          return (
            <button key={id} className="boon-card" style={{ animationDelay: `${1.6 + i * 0.1}s` }} onClick={() => session.dispatch({ type: "PICK_BOON", id })} data-boon={id}>
              <span className="bc-n">{i + 1}</span>
              <span className="bc-kanji">{b.kanji}</span>
              <b>{tr(b.name)}</b>
              <em>{tr(b.desc)}</em>
            </button>
          );
        })}
      </div>
      <div className="bp-hint">{t("boonHint")}</div>
    </div>
  );
}
