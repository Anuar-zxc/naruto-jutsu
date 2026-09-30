"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { fetchBoard, type LbBoard } from "@/lib/net/leaderboard";
import { CHARACTERS, type CharacterId } from "@/lib/game/characters";
import { todayKey } from "@/lib/game/mutators";
import { t, tr } from "@/lib/i18n";
import { Portrait } from "./Portrait";

/** Online top: best survival run and today's daily challenge score, per nickname. */
export function Leaderboard({ onClose }: { onClose: () => void }) {
  useLang();
  const session = useSession();
  const p = useProfile();
  const [tab, setTab] = useState<"survival" | "daily">("survival");
  const [data, setData] = useState<LbBoard | null>(null);
  const board = tab === "survival" ? "survival" : `daily:${todayKey()}`;

  useEffect(() => {
    let alive = true;
    setData(null);
    void fetchBoard(board).then((d) => alive && setData(d));
    return () => {
      alive = false;
    };
  }, [board]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const myBest = tab === "survival" ? session.getSurvivalBest().wave : (session.getRecords()[`daily:${todayKey()}`]?.score ?? 0);
  const myRank = data ? data.entries.findIndex((e) => e.nick === p.nick) : -1;

  return (
    <div className="select-overlay lb-screen">
      <header className="ach-head">
        <div className="ach-title">
          <span className="ach-kanji">番付</span>
          <div>
            <b>{t("lbTitle")}</b>
            <em>{t("lbSub")}</em>
          </div>
        </div>
        <nav className="ach-tabs">
          <button className={tab === "survival" ? "on" : ""} onClick={() => setTab("survival")} data-tab="survival">
            生存 {t("survivalTitle")}
          </button>
          <button className={tab === "daily" ? "on" : ""} onClick={() => setTab("daily")} data-tab="daily">
            日課 {t("dailyTitle")}
          </button>
        </nav>
      </header>

      <div className="lb-list">
        {!data && <div className="lb-empty">{t("lbLoading")}</div>}
        {data && data.entries.length === 0 && <div className="lb-empty">{t("lbEmpty")}</div>}
        {data?.entries.map((e, i) => {
          const hero = CHARACTERS[(e.hero in CHARACTERS ? e.hero : "naruto") as CharacterId];
          return (
            <div key={e.nick} className={`lb-row ${i < 3 ? `top top${i + 1}` : ""} ${e.nick === p.nick ? "me" : ""}`} style={{ animationDelay: `${Math.min(i, 15) * 0.03}s` }}>
              <span className="lb-pos">{i < 3 ? ["一", "二", "三"][i] : i + 1}</span>
              <Portrait ch={hero} className="lb-face" lazy />
              <span className="lb-nick">
                <b>{e.nick}</b>
                <em>{tr(hero.name)}</em>
              </span>
              <span className="lb-score">
                <b>{e.score.toLocaleString("en-US")}</b>
                <em>{tab === "survival" ? t("lbWaves") : t("pts")}</em>
              </span>
            </div>
          );
        })}
      </div>

      <footer className="lb-foot">
        <span>
          {t("lbYou", { nick: p.nick })} <b>{myBest ? myBest.toLocaleString("en-US") : "—"}</b>
          {myRank >= 0 && <em> · #{myRank + 1}</em>}
        </span>
        {data && !data.persistent && <span className="lb-warn">{t("lbTemp")}</span>}
        <button className="btn ghost small" onClick={onClose} data-action="close-lb">
          {t("back")}
        </button>
      </footer>
    </div>
  );
}
