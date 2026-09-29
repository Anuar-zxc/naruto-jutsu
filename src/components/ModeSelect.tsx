"use client";

import { useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { SIGN_LIST } from "@/lib/vision/gestureDefinitions";
import { useEffect, useState } from "react";
import type { GameMode } from "@/types/game";
import { CHARACTERS, type CharacterId } from "@/lib/game/characters";
import { Portrait } from "./Portrait";

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
  const openShop = () => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "OPEN_SHOP" });
  };
  const bg = (f: string) => `/assets/backgrounds/${f}.webp`;
  const cards: { id: string; cls: string; kanji: string; title: string; desc: string; meta?: string; bg: string; hero: CharacterId; accent: string; onClick: () => void }[] = [
    { id: "story", cls: "story", kanji: "物語", title: t("storyTitle"), desc: t("storyDesc"), bg: bg("valley"), hero: "naruto-six-paths", accent: "#e63946", onClick: () => pick("story") },
    { id: "quick", cls: "quick", kanji: "決闘", title: t("quickTitle"), desc: t("quickDesc"), meta: best != null ? t("bestScore", { n: best.toLocaleString("en-US") }) : undefined, bg: bg("war"), hero: "sasuke", accent: "#2ec5ff", onClick: () => pick("quick") },
    { id: "duel", cls: "duel", kanji: "対戦", title: t("duelTitle"), desc: t("duelDesc"), bg: bg("arena"), hero: "itachi", accent: "#9d4eff", onClick: () => pick("duel") },
    { id: "training", cls: "dojo", kanji: "修行", title: t("dojoTitle"), desc: t("dojoDesc"), meta: t("dojoMastered", { m: mastered, n: SIGN_LIST.length }), bg: bg("canyon"), hero: "kakashi", accent: "#ffc15e", onClick: () => pick("training") },
    { id: "shop", cls: "shop-card-mode", kanji: "店", title: t("shopTitle"), desc: t("shopDesc"), meta: `両 ${profile.ryo.toLocaleString("en-US")} ${t("ryo")}`, bg: bg("villagenight"), hero: "jiraiya", accent: "#5dffc1", onClick: openShop },
  ];
  return (
    <div className="select-overlay">
      <div className="select-title">{t("chooseMode")}</div>
      <button className="player-bar" onClick={() => session.dispatch({ type: "OPEN_SHOP" })} title={t("shopTitle")}>
        <b>{profile.nick}</b>
        <span className="purse-coin">両</span>
        <em>{profile.ryo.toLocaleString("en-US")}</em>
      </button>
      <div className="mode-cards posters">
        {cards.map((c, i) => (
          <button
            key={c.id}
            className={`mode-card poster ${c.cls}`}
            onClick={c.onClick}
            data-mode={c.id}
            style={{ animationDelay: `${i * 0.07}s`, ["--accent" as string]: c.accent }}
          >
            <div className="mc-bg" style={{ backgroundImage: `url(${c.bg})` }} />
            <div className="mc-shade" />
            <Portrait ch={CHARACTERS[c.hero]} className="mc-hero" />
            <div className="mc-body">
              <div className="mode-kanji">{c.kanji}</div>
              <div className="mode-title">{c.title}</div>
              <div className="mode-desc">{c.desc}</div>
              {c.meta && <div className="mode-meta">{c.meta}</div>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
