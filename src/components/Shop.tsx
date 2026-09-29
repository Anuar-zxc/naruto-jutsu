"use client";

import { useState } from "react";
import { useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { MAX_NICK, UPGRADES, nextCost } from "@/lib/game/profile";
import { t, tr } from "@/lib/i18n";

/** Profile + upgrade shop: nickname, ryō balance, five upgrades. */
export function Shop() {
  useLang();
  const session = useSession();
  const p = useProfile();
  const [nick, setNick] = useState(p.nick);
  const [flash, setFlash] = useState<string | null>(null);

  return (
    <div className="select-overlay shop">
      <div className="select-title">
        <span>店</span>
        {t("shopHeader")}
      </div>

      <div className="shop-top">
        <form
          className="nick-form"
          onSubmit={(e: { preventDefault(): void }) => {
            e.preventDefault();
            session.setNick(nick);
            session.sfx.select();
          }}
        >
          <label>{t("nickLabel")}</label>
          <input value={nick} onChange={(e: { target: { value: string } }) => setNick(e.target.value)} maxLength={MAX_NICK} data-input="nick" />
          <button className="btn small" type="submit" disabled={!nick.trim() || nick.trim() === p.nick}>
            {t("nickSave")}
          </button>
        </form>
        <div className="purse" data-ryo={p.ryo}>
          <span className="purse-coin">両</span>
          <b>{p.ryo.toLocaleString("en-US")}</b> {t("ryo")}
          <em>{t("statsLine", { w: p.wins, d: p.duelsWon })}</em>
        </div>
      </div>

      <div className="shop-grid">
        {UPGRADES.map((u) => {
          const lvl = p.upgrades[u.id];
          const cost = nextCost(p, u.id);
          const afford = cost != null && p.ryo >= cost;
          return (
            <div key={u.id} className={`shop-card ${lvl >= u.max ? "maxed" : ""}`} data-upgrade={u.id}>
              <div className="shop-kanji">{u.kanji}</div>
              <div className="shop-name">{tr(u.name)}</div>
              <div className="shop-per">{tr(u.per)}</div>
              <div className="shop-pips">
                {Array.from({ length: u.max }, (_, i) => (
                  <i key={i} className={i < lvl ? "on" : ""} />
                ))}
                <span>{t("level", { n: lvl, m: u.max })}</span>
              </div>
              <button
                className={`btn small ${afford ? "primary" : "ghost"}`}
                disabled={cost == null || !afford}
                onClick={() => {
                  if (session.buyUpgrade(u.id)) {
                    session.sfx.mastered();
                    setFlash(u.id);
                    setTimeout(() => setFlash(null), 700);
                  }
                }}
                data-action={`buy-${u.id}`}
              >
                {cost == null ? t("maxed") : afford ? t("buyFor", { n: cost }) : `${t("notEnough")} · ${cost}`}
              </button>
              {flash === u.id && <div className="shop-flash">+1</div>}
            </div>
          );
        })}
      </div>

      <p className="select-tip">{t("shopHint")}</p>
      <div className="chapter-actions">
        <button className="btn ghost small" onClick={() => session.dispatch({ type: "CLOSE_SHOP" })} data-action="close-shop">
          {t("back")}
        </button>
      </div>
    </div>
  );
}
