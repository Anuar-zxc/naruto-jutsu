"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { MAX_NICK, UPGRADES, nextCost, type UpgradeId } from "@/lib/game/profile";
import { CHARACTERS } from "@/lib/game/characters";
import { getLang, t, tr } from "@/lib/i18n";
import { ITEM_LIST, RARITY_COLOR, RARITY_NAME, type ItemId, type ItemSlot } from "@/lib/game/items";
import { describeBonus } from "@/lib/game/bonuses";
import { Portrait } from "./Portrait";

/** What an upgrade gives at a given level, as a short number. */
function effectAt(id: UpgradeId, lvl: number): string {
  switch (id) {
    case "chakra":
      return `+${lvl * 10}%`;
    case "power":
      return `+${lvl * 8}%`;
    case "speed":
      return `+${lvl} ${t("sec")}`;
    case "focus":
      return `−${lvl * 15}%`;
    case "guard":
      return `${lvl} 🛡`;
  }
}

/** Ryō counter that rolls to its new value. */
function useRolling(value: number) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 600);
      const v = Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3)));
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/**
 * The shop, as a place: a lantern-lit street, the Toad Sage behind the counter
 * talking to you, and the upgrades as scrolls with a red hanko seal, a level
 * track and a price tag. Your ninja card (nickname, record) sits at the bottom.
 */
export function Shop() {
  useLang();
  const session = useSession();
  const p = useProfile();
  const [nick, setNick] = useState(p.nick);
  const [flash, setFlash] = useState<string | null>(null);
  const [line, setLine] = useState<{ text: string; key: number }>({ text: t("keeperHello"), key: 0 });
  const [tab, setTab] = useState<"scrolls" | ItemSlot>("scrolls");
  const lang = getLang();
  const buyItem = (id: ItemId) => {
    const it = ITEM_LIST.find((x) => x.id === id)!;
    if (p.owned.includes(id)) {
      session.equip(id);
      session.sfx.select();
      return say(p.eye === id || p.weapon === id ? t("keeperUnequip", { name: tr(it.name) }) : t("keeperEquip", { name: tr(it.name) }));
    }
    if (p.ryo < it.price) {
      session.sfx.error();
      return say(t("keeperPoor", { n: it.price - p.ryo }));
    }
    if (session.buyItem(id)) {
      session.sfx.mastered();
      setFlash(id);
      setTimeout(() => setFlash(null), 900);
      say(t("keeperItem", { name: tr(it.name) }));
    }
  };
  const ryo = useRolling(p.ryo);
  const keeper = CHARACTERS.jiraiya;
  const say = (text: string) => setLine({ text, key: Date.now() });

  const buy = (id: UpgradeId) => {
    const cost = nextCost(p, id);
    if (cost == null) return say(t("keeperMaxed"));
    if (p.ryo < cost) {
      session.sfx.error();
      return say(t("keeperPoor", { n: cost - p.ryo }));
    }
    if (session.buyUpgrade(id)) {
      session.sfx.mastered();
      setFlash(id);
      setTimeout(() => setFlash(null), 900);
      const u = UPGRADES.find((x) => x.id === id)!;
      say(t("keeperBought", { name: tr(u.name) }));
    }
  };

  return (
    <div className="select-overlay shop2">
      <div className="shop2-bg" aria-hidden />

      <div className="shop2-layout">
        <aside className="shop2-keeper">
          <div className="sk-bubble" key={line.key}>
            {line.text}
          </div>
          <Portrait ch={keeper} className="sk-img" />
          <div className="sk-name">
            {tr(keeper.name)} · <span>{t("keeperTitle")}</span>
          </div>
        </aside>

        <main className="shop2-main">
          <header className="shop2-head">
            <div className="shop2-title">
              <span className="shop2-kanji">店</span>
              <div>
                <b>{t("shopHeader")}</b>
                <em>{t("shopSub")}</em>
              </div>
            </div>
            <div className="shop2-purse" data-ryo={p.ryo}>
              <span className="purse-coin big">両</span>
              <b>{ryo.toLocaleString("en-US")}</b>
              <span>{t("ryo")}</span>
            </div>
          </header>

          <nav className="ach-tabs shop-tabs">
            <button className={tab === "scrolls" ? "on" : ""} onClick={() => setTab("scrolls")} data-tab="scrolls">
              巻 {t("tabScrolls")}
            </button>
            <button className={tab === "eye" ? "on" : ""} onClick={() => setTab("eye")} data-tab="eye">
              眼 {t("tabEyes")}
            </button>
            <button className={tab === "weapon" ? "on" : ""} onClick={() => setTab("weapon")} data-tab="weapon">
              武 {t("tabWeapons")}
            </button>
          </nav>

          {tab !== "scrolls" && (
            <div className="armory">
              {ITEM_LIST.filter((it) => it.slot === tab).map((it, i) => {
                const own = p.owned.includes(it.id);
                const on = p.eye === it.id || p.weapon === it.id;
                const afford = p.ryo >= it.price;
                return (
                  <button
                    key={it.id}
                    className={`item-card ${it.slot} ${own ? "own" : ""} ${on ? "on" : ""} ${!own && afford ? "afford" : ""} ${flash === it.id ? "bought" : ""}`}
                    style={{ ["--glow" as string]: it.color, ["--rar" as string]: RARITY_COLOR[it.rarity], animationDelay: `${i * 0.04}s` }}
                    onClick={() => buyItem(it.id)}
                    data-item={it.id}
                  >
                    <div className="ic-art">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={it.image} alt={tr(it.name)} loading="lazy" />
                    </div>
                    <div className="ic-kanji">{it.kanji}</div>
                    <b className="ic-name">{tr(it.name)}</b>
                    <span className="ic-rar">{tr(RARITY_NAME[it.rarity])}</span>
                    <ul className="ic-bonus">
                      {describeBonus(it.bonus, lang).map((x) => (
                        <li key={x}>{x}</li>
                      ))}
                    </ul>
                    <p className="ic-lore">{tr(it.lore)}</p>
                    <div className="ic-foot">
                      {on ? (
                        <em className="ic-on">✓ {t("equipped")}</em>
                      ) : own ? (
                        <em>{t("equip")}</em>
                      ) : (
                        <span className="si-price">
                          <span className="purse-coin">両</span>
                          {it.price.toLocaleString("en-US")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {tab === "scrolls" && <div className="shop2-list">
            {UPGRADES.map((u, i) => {
              const lvl = p.upgrades[u.id];
              const cost = nextCost(p, u.id);
              const maxed = cost == null;
              const afford = !maxed && p.ryo >= cost;
              return (
                <div
                  key={u.id}
                  className={`scroll-item ${maxed ? "maxed" : ""} ${afford ? "afford" : ""} ${flash === u.id ? "bought" : ""}`}
                  style={{ animationDelay: `${i * 0.06}s` }}
                  data-upgrade={u.id}
                >
                  <div className="si-seal">
                    <span>{u.kanji}</span>
                  </div>
                  <div className="si-body">
                    <div className="si-name">{tr(u.name)}</div>
                    <div className="si-per">{tr(u.per)}</div>
                    <div className="si-track">
                      {Array.from({ length: u.max }, (_, k) => (
                        <i key={k} className={k < lvl ? "on" : k === lvl && !maxed ? "next" : ""} />
                      ))}
                      <span className="si-now">
                        {effectAt(u.id, lvl)}
                        {!maxed && <em> → {effectAt(u.id, lvl + 1)}</em>}
                      </span>
                    </div>
                  </div>
                  <button className="si-buy" disabled={maxed} onClick={() => buy(u.id)} data-action={`buy-${u.id}`} aria-label={maxed ? t("maxed") : t("buyFor", { n: cost })}>
                    {maxed ? (
                      <b className="si-max">{t("maxed")}</b>
                    ) : (
                      <>
                        <span className="si-price">
                          <span className="purse-coin">両</span>
                          {cost.toLocaleString("en-US")}
                        </span>
                        <em>{afford ? t("buyShort") : t("notEnough")}</em>
                      </>
                    )}
                  </button>
                  {flash === u.id && (
                    <div className="si-burst" aria-hidden>
                      <span>+1</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>}

          <footer className="shop2-foot">
            <form
              className="ninja-card"
              onSubmit={(e: { preventDefault(): void }) => {
                e.preventDefault();
                session.setNick(nick);
                session.sfx.select();
                say(t("keeperNick", { nick: nick.trim() }));
              }}
            >
              <div className="nc-stamp">忍</div>
              <div className="nc-fields">
                <label>{t("nickLabel")}</label>
                <div className="nc-row">
                  <input value={nick} onChange={(e: { target: { value: string } }) => setNick(e.target.value)} maxLength={MAX_NICK} data-input="nick" />
                  <button className="btn small" type="submit" disabled={!nick.trim() || nick.trim() === p.nick}>
                    {t("nickSave")}
                  </button>
                </div>
                <div className="nc-stats">{t("statsLine", { w: p.wins, d: p.duelsWon })}</div>
              </div>
            </form>
            <p className="shop2-hint">{t("shopHint")}</p>
            <button className="btn ghost small" onClick={() => session.dispatch({ type: "CLOSE_SHOP" })} data-action="close-shop">
              {t("back")}
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}
