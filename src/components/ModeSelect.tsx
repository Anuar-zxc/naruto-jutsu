"use client";

import { useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { SIGN_LIST } from "@/lib/vision/gestureDefinitions";
import { useEffect, useState } from "react";
import type { GameMode } from "@/types/game";
import { CHARACTERS, type CharacterId } from "@/lib/game/characters";
import { Portrait } from "./Portrait";
import { Achievements } from "./Achievements";
import { ACHIEVEMENTS } from "@/lib/game/achievements";
import { MUTATORS } from "@/lib/game/mutators";
import { t, tr } from "@/lib/i18n";

interface Entry {
  id: string;
  kanji: string;
  title: string;
  tag: string;
  desc: string;
  meta?: string;
  bg: string;
  hero: CharacterId;
  accent: string;
  go: () => void;
}

/**
 * Main menu, fighting-game style: a vertical list of modes on the left, and the
 * highlighted mode shown big on the right — its location, its fighter, a giant
 * kanji and what you get. Hover / arrows / finger preview it; click or Enter starts it.
 */
export function ModeSelect() {
  useLang();
  const session = useSession();
  const profile = useProfile();
  const [best, setBest] = useState<number | null>(null);
  const [bestWave, setBestWave] = useState(0);
  const [mastered, setMastered] = useState(0);
  const [sel, setSel] = useState(0);
  const [showAch, setShowAch] = useState(false);
  const daily = session.daily();
  const dailyDone = session.dailyDone();
  const achDone = ACHIEVEMENTS.filter((a) => session.isUnlocked(a.id)).length;

  useEffect(() => {
    setBest(session.getRecords().quick?.score ?? null);
    setBestWave(session.getSurvivalBest().wave);
    try {
      const v = JSON.parse(localStorage.getItem("shinobi.dojo") ?? "[]");
      setMastered(Array.isArray(v) ? v.filter((x) => SIGN_LIST.some((d) => d.id === x)).length : 0);
    } catch {
      /* ignore */
    }
  }, [session]);

  const pick = (mode: GameMode) => {
    session.sfx.unlock();
    session.sfx.detected();
    session.dispatch({ type: "SELECT_MODE", mode });
  };
  const bg = (f: string) => `/assets/backgrounds/${f}.webp`;
  const entries: Entry[] = [
    { id: "story", kanji: "物語", title: t("storyTitle"), tag: t("tagStory"), desc: t("storyDesc"), bg: bg("valley"), hero: "naruto-six-paths", accent: "#ff4d5e", go: () => pick("story") },
    { id: "quick", kanji: "決闘", title: t("quickTitle"), tag: t("tagQuick"), desc: t("quickDesc"), meta: best != null ? t("bestScore", { n: best.toLocaleString("en-US") }) : undefined, bg: bg("war"), hero: "sasuke", accent: "#2ec5ff", go: () => pick("quick") },
    { id: "survival", kanji: "生存", title: t("survivalTitle"), tag: t("tagSurvival"), desc: t("survivalDesc"), meta: bestWave > 0 ? t("survivalBest", { n: bestWave }) : undefined, bg: bg("redmoon"), hero: "might-guy", accent: "#ff8a1f", go: () => pick("survival") },
    {
      id: "daily",
      kanji: "日課",
      title: t("dailyTitle"),
      tag: t("tagDaily"),
      desc: t("dailyDesc", { foe: tr(CHARACTERS[daily.foe].name), mods: daily.mutators.map((m) => `${MUTATORS[m].kanji} ${tr(MUTATORS[m].name)} (${tr(MUTATORS[m].desc)})`).join(", "), n: daily.reward }),
      meta: dailyDone ? t("dailyDone") : `両 ${daily.reward}`,
      bg: bg("summit"),
      hero: daily.foe,
      accent: "#ff3d6e",
      go: () => pick("daily"),
    },
    { id: "duel", kanji: "対戦", title: t("duelTitle"), tag: t("tagDuel"), desc: t("duelDesc"), bg: bg("arena"), hero: "itachi", accent: "#a970ff", go: () => pick("duel") },
    { id: "training", kanji: "修行", title: t("dojoTitle"), tag: t("tagDojo"), desc: t("dojoDesc"), meta: t("dojoMastered", { m: mastered, n: SIGN_LIST.length }), bg: bg("canyon"), hero: "kakashi", accent: "#ffc15e", go: () => pick("training") },
    {
      id: "achievements",
      kanji: "実績",
      title: t("achTitle"),
      tag: t("tagAch"),
      desc: t("achDesc", { n: achDone, m: ACHIEVEMENTS.length }),
      meta: `🏆 ${achDone} / ${ACHIEVEMENTS.length}`,
      bg: bg("konohanight"),
      hero: "hiruzen",
      accent: "#ffd166",
      go: () => {
        session.sfx.select();
        setShowAch(true);
      },
    },
    {
      id: "shop",
      kanji: "店",
      title: t("shopTitle"),
      tag: t("tagShop"),
      desc: t("shopDesc"),
      meta: `両 ${profile.ryo.toLocaleString("en-US")} ${t("ryo")}`,
      bg: bg("tanzaku"),
      hero: "jiraiya",
      accent: "#4dffb8",
      go: () => {
        session.sfx.unlock();
        session.sfx.select();
        session.dispatch({ type: "OPEN_SHOP" });
      },
    },
  ];
  const cur = entries[sel];

  const focus = (i: number) => {
    if (i === sel) return;
    session.sfx.tick();
    setSel(i);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (showAch) return;
      if (e.key === "ArrowDown" || e.key === "s") setSel((i) => (i + 1) % entries.length);
      else if (e.key === "ArrowUp" || e.key === "w") setSel((i) => (i - 1 + entries.length) % entries.length);
      else if (e.key === "Enter") entries[sel].go();
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="select-overlay main-menu" style={{ ["--accent" as string]: cur.accent }}>
      {showAch && <Achievements onClose={() => setShowAch(false)} />}
      {/* The highlighted mode's location fills the screen. */}
      <div className="mm-bg">
        {entries.map((e, i) => (
          <div key={e.id} className={`mm-bg-img ${i === sel ? "on" : ""}`} style={{ backgroundImage: `url(${e.bg})` }} />
        ))}
        <div className="mm-bg-shade" />
      </div>

      <div className="mm-left">
        <div className="mm-head">
          <div className="mm-title">{t("chooseMode")}</div>
          <button className="mm-player" onClick={() => entries.find((e) => e.id === "shop")!.go()} title={t("shopTitle")}>
            <b>{profile.nick}</b>
            <span className="purse-coin">両</span>
            <em>{profile.ryo.toLocaleString("en-US")}</em>
          </button>
        </div>
        <nav className="mm-list">
          {entries.map((e, i) => (
            <button
              key={e.id}
              className={`mm-item ${i === sel ? "on" : ""}`}
              style={{ ["--accent" as string]: e.accent, animationDelay: `${i * 0.05}s` }}
              onMouseEnter={() => focus(i)}
              onFocus={() => focus(i)}
              onClick={e.go}
              data-mode={e.id}
            >
              <span className="mm-kanji">{e.kanji}</span>
              <span className="mm-text">
                <b>{e.title}</b>
                <em>{e.tag}</em>
              </span>
              <span className="mm-arrow" aria-hidden>
                ▶
              </span>
            </button>
          ))}
        </nav>
        <div className="mm-hint">{t("menuHint")}</div>
      </div>

      <div className="mm-right" key={cur.id}>
        <div className="mm-big-kanji" aria-hidden>
          {cur.kanji}
        </div>
        <Portrait ch={CHARACTERS[cur.hero]} className="mm-hero" />
        <div className="mm-card">
          <div className="mm-card-kanji">{cur.kanji}</div>
          <div className="mm-card-title">{cur.title}</div>
          <p className="mm-card-desc">{cur.desc}</p>
          <div className="mm-card-foot">
            {cur.meta && <span className="mm-meta">{cur.meta}</span>}
            <button className="btn primary mm-go" onClick={cur.go} data-action="mode-go">
              {cur.id === "shop" ? t("enterShop") : cur.id === "achievements" ? t("achOpen") : t("playCta")} ▸
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
