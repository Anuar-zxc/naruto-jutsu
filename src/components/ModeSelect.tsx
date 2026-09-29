"use client";

import { useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { SIGN_LIST } from "@/lib/vision/gestureDefinitions";
import { useEffect, useState } from "react";
import type { GameMode } from "@/types/game";

export function ModeSelect() {
  useLang();
  const session = useSession();
  const [best, setBest] = useState<number | null>(null);
  const [mastered, setMastered] = useState(0);
  useEffect(() => {
    setBest(session.getRecords().quick?.score ?? null);
    try {
      const v = JSON.parse(localStorage.getItem("shinobi.dojo") ?? "[]");
      setMastered(Array.isArray(v) ? v.filter((x) => SIGN_LIST.some((d) => d.id === x)).length : 0);
    } catch {
      /* ignore */
    }
  }, [session]);
  const profile = useProfile();
  const pick = (mode: GameMode) => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "SELECT_MODE", mode });
  };
  return (
    <div className="select-overlay">
      <div className="select-title">{t("chooseMode")}</div>
      <button className="player-bar" onClick={() => session.dispatch({ type: "OPEN_SHOP" })} title={t("shopTitle")}>
        <b>{profile.nick}</b>
        <span className="purse-coin">両</span>
        <em>{profile.ryo.toLocaleString("en-US")}</em>
      </button>
      <div className="mode-cards">
        <button className="mode-card story" onClick={() => pick("story")} data-mode="story">
          <div className="mode-kanji">物語</div>
          <div className="mode-title">{t("storyTitle")}</div>
          <div className="mode-desc">{t("storyDesc")}</div>
        </button>
        <button className="mode-card quick" onClick={() => pick("quick")} data-mode="quick">
          <div className="mode-kanji">決闘</div>
          <div className="mode-title">{t("quickTitle")}</div>
          <div className="mode-desc">{t("quickDesc")}</div>
          {best != null && <div className="mode-meta">{t("bestScore", { n: best.toLocaleString("en-US") })}</div>}
        </button>
        <button className="mode-card dojo" onClick={() => pick("training")} data-mode="training">
          <div className="mode-kanji">修行</div>
          <div className="mode-title">{t("dojoTitle")}</div>
          <div className="mode-desc">{t("dojoDesc")}</div>
          <div className="mode-meta">{t("dojoMastered", { m: mastered, n: SIGN_LIST.length })}</div>
        </button>
        <button className="mode-card duel" onClick={() => pick("duel")} data-mode="duel">
          <div className="mode-kanji">対戦</div>
          <div className="mode-title">{t("duelTitle")}</div>
          <div className="mode-desc">{t("duelDesc")}</div>
        </button>
        <button
          className="mode-card shop-card-mode"
          onClick={() => {
            session.sfx.unlock();
            session.sfx.select();
            session.dispatch({ type: "OPEN_SHOP" });
          }}
          data-mode="shop"
        >
          <div className="mode-kanji">店</div>
          <div className="mode-title">{t("shopTitle")}</div>
          <div className="mode-desc">{t("shopDesc")}</div>
          <div className="mode-meta">両 {profile.ryo.toLocaleString("en-US")} {t("ryo")}</div>
        </button>
      </div>
    </div>
  );
}
