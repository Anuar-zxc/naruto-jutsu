"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { CLANS, CLAN_LIST, CLAN_SWITCH_COST, TIER_COST, canLearn, type ClanId } from "@/lib/game/clans";
import { CHARACTERS } from "@/lib/game/characters";
import { describeBonus } from "@/lib/game/bonuses";
import { FRAMES, MAX_LEVEL, SEASON, TITLES, levelProgress, rewardFor, unlockedCosmetics, type PassReward } from "@/lib/game/pass";
import { getLang, t, tr } from "@/lib/i18n";
import { Portrait } from "./Portrait";

function rewardLabel(r: PassReward) {
  if (r.kind === "ryo") return { icon: "両", text: `+${r.n}` };
  if (r.kind === "title") return { icon: "称", text: tr(TITLES[r.id]) };
  return { icon: FRAMES[r.id].kanji, text: tr(FRAMES[r.id].name) };
}

/**
 * Shinobi Path: the clan (with its talent tree) and the season pass
 * (levels, rewards, titles and battle-card frames).
 */
export function PathScreen({ onClose, initial = "clan" }: { onClose: () => void; initial?: "clan" | "pass" }) {
  useLang();
  const session = useSession();
  useSyncExternalStore(session.subscribeAch, session.getAchVersion, () => 0);
  const p = useProfile();
  const lang = getLang();
  const [tab, setTab] = useState<"clan" | "pass">(initial);
  const [view, setView] = useState<ClanId>(p.clan ?? "uzumaki");
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const prog = levelProgress(p.xp);
  const points = session.talentPoints();
  const free = session.freePoints();
  const clan = CLANS[view];
  const mine = p.clan === view;
  const cos = unlockedCosmetics(p.passPaid);
  const say = (text: string) => setMsg({ text, key: Date.now() });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Scroll the pass track to the current level.
  useEffect(() => {
    if (tab !== "pass") return;
    const el = trackRef.current?.querySelector(".pl-cur") as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [tab]);

  const join = () => {
    const cost = p.clan ? CLAN_SWITCH_COST : 0;
    if (p.ryo < cost) {
      session.sfx.error();
      return say(t("notEnough"));
    }
    if (session.joinClan(view)) {
      session.sfx.mastered();
      say(t("clanJoined", { clan: tr(clan.name) }));
    }
  };
  const learn = (id: string) => {
    if (session.learnTalent(id)) session.sfx.mastered();
    else session.sfx.error();
  };

  return (
    <div className="select-overlay path-screen" style={{ ["--clan" as string]: clan.color }}>
      <header className="path-head">
        <div className="path-title">
          <span className="path-kanji">道</span>
          <div>
            <b>{t("pathTitle")}</b>
            <em>{tr(SEASON)}</em>
          </div>
        </div>
        <div className="path-level" data-level={prog.level}>
          <div className="pl-badge">
            <em>{t("levelShort")}</em>
            <b>{prog.level}</b>
          </div>
          <div className="pl-xp">
            <div className="pl-bar">
              <i style={{ width: `${(prog.into / prog.need) * 100}%` }} />
            </div>
            <span>{prog.level >= MAX_LEVEL ? t("maxLevel") : t("xpLine", { a: prog.into, b: prog.need })}</span>
          </div>
        </div>
        <nav className="ach-tabs path-tabs">
          <button className={tab === "clan" ? "on" : ""} onClick={() => setTab("clan")} data-tab="clan">
            氏族 {t("tabClan")}
          </button>
          <button className={tab === "pass" ? "on" : ""} onClick={() => setTab("pass")} data-tab="pass">
            道 {t("tabPass")}
          </button>
        </nav>
      </header>

      {tab === "clan" ? (
        <div className="clan-layout">
          <div className="clan-list">
            {CLAN_LIST.map((c) => (
              <button key={c.id} className={`clan-card ${view === c.id ? "on" : ""} ${p.clan === c.id ? "mine" : ""}`} style={{ ["--clan" as string]: c.color }} onClick={() => setView(c.id)} onMouseEnter={() => setView(c.id)} data-clan={c.id}>
                <Portrait ch={CHARACTERS[c.face]} className="clc-img" lazy />
                <span className="clc-kanji">{c.kanji}</span>
                <b>{tr(c.name)}</b>
                {p.clan === c.id && <em>{t("yourClan")}</em>}
              </button>
            ))}
          </div>

          <div className="clan-detail" key={view}>
            <div className="cd-top">
              <div className="cd-crest">{clan.kanji}</div>
              <div className="cd-info">
                <b>{t("clanOf", { clan: tr(clan.name) })}</b>
                <p>{tr(clan.motto)}</p>
                <div className="cd-passive">
                  <em>{t("clanPassive")}</em> {describeBonus(clan.passive, lang).join(" · ")}
                </div>
              </div>
              <div className="cd-actions">
                {mine ? (
                  <div className="cd-points" data-free={free}>
                    <b>{free}</b>
                    <span>{t("talentPoints", { n: points })}</span>
                    <button className="btn ghost small" onClick={() => session.resetTalents()} disabled={!p.talents.length} data-action="reset-talents">
                      {t("resetTalents")}
                    </button>
                  </div>
                ) : (
                  <button className="btn primary" onClick={join} data-action="join-clan">
                    {p.clan ? t("switchClan", { n: CLAN_SWITCH_COST }) : t("joinClan")}
                  </button>
                )}
              </div>
            </div>

            <div className={`talent-tree ${mine ? "" : "preview"}`}>
              {([1, 2, 3, 4] as const).map((tier) => (
                <div key={tier} className={`tt-row tier-${tier}`}>
                  <div className="tt-tier">
                    <b>{["", "壱", "弐", "参", "極"][tier]}</b>
                    <em>{t("tierCost", { n: TIER_COST[tier] })}</em>
                  </div>
                  {clan.talents
                    .filter((x) => x.tier === tier)
                    .map((x) => {
                      const has = mine && p.talents.includes(x.id);
                      const can = mine && canLearn(p.clan, p.talents, x.id, points);
                      return (
                        <button key={x.id} className={`talent ${has ? "has" : can ? "can" : "locked"}`} onClick={() => can && learn(x.id)} disabled={!can && !has} data-talent={x.id}>
                          <span className="tl-kanji">{x.kanji}</span>
                          <span className="tl-body">
                            <b>{tr(x.name)}</b>
                            <em>{describeBonus(x.bonus, lang).join(" · ")}</em>
                          </span>
                          {has && <i className="tl-ok">✓</i>}
                        </button>
                      );
                    })}
                </div>
              ))}
            </div>
            {!mine && <p className="path-hint">{t("clanHint")}</p>}
          </div>
        </div>
      ) : (
        <div className="pass-layout">
          <div className="pass-track" ref={trackRef}>
            {Array.from({ length: MAX_LEVEL - 1 }, (_, i) => i + 2).map((lvl) => {
              const r = rewardLabel(rewardFor(lvl));
              const got = lvl <= p.passPaid;
              const cur = lvl === prog.level + 1;
              return (
                <div key={lvl} className={`pass-lvl ${got ? "got" : ""} ${cur ? "pl-cur" : ""} ${rewardFor(lvl).kind}`} data-lvl={lvl}>
                  <em>{lvl}</em>
                  <span className="pr-icon">{r.icon}</span>
                  <b>{r.text}</b>
                  {got && <i>✓</i>}
                </div>
              );
            })}
          </div>
          <div className="cosmetics">
            <section>
              <h3>{t("titlesHead")}</h3>
              <div className="cos-list">
                <button className={!p.title ? "on" : ""} onClick={() => session.setTitle(null)}>
                  —
                </button>
                {(Object.keys(TITLES) as (keyof typeof TITLES)[]).map((id) => {
                  const ok = cos.titles.includes(id);
                  return (
                    <button key={id} className={`${p.title === id ? "on" : ""} ${ok ? "" : "locked"}`} disabled={!ok} onClick={() => session.setTitle(id)} data-title={id}>
                      {tr(TITLES[id])}
                    </button>
                  );
                })}
              </div>
            </section>
            <section>
              <h3>{t("framesHead")}</h3>
              <div className="cos-list frames">
                <button className={!p.frame ? "on" : ""} onClick={() => session.setFrame(null)}>
                  —
                </button>
                {(Object.keys(FRAMES) as (keyof typeof FRAMES)[]).map((id) => {
                  const f = FRAMES[id];
                  const ok = cos.frames.includes(id);
                  return (
                    <button key={id} className={`frame-chip ${p.frame === id ? "on" : ""} ${ok ? "" : "locked"}`} disabled={!ok} onClick={() => session.setFrame(id)} style={{ ["--f1" as string]: f.colors[0], ["--f2" as string]: f.colors[1] }} data-frame={id}>
                      <i>{f.kanji}</i> {tr(f.name)}
                    </button>
                  );
                })}
              </div>
            </section>
            <div className="nick-preview" style={p.frame ? { ["--f1" as string]: FRAMES[p.frame].colors[0], ["--f2" as string]: FRAMES[p.frame].colors[1] } : undefined}>
              <b>{p.nick}</b>
              {p.title && <em>{tr(TITLES[p.title])}</em>}
            </div>
            <p className="path-hint">{t("passHint")}</p>
          </div>
        </div>
      )}

      {msg && (
        <div className="path-msg" key={msg.key}>
          {msg.text}
        </div>
      )}
      <button className="btn ghost small" onClick={onClose} data-action="close-path">
        {t("back")}
      </button>
    </div>
  );
}

/** Level-up banners (the pass), shown anywhere in the game. */
export function LevelToasts() {
  useLang();
  const session = useSession();
  const v = useSyncExternalStore(session.subscribeAch, session.getAchVersion, () => 0);
  const [shown, setShown] = useState<{ key: number; level: number; icon: string; text: string }[]>([]);
  const [seen, setSeen] = useState(0);
  useEffect(() => {
    const fresh = session.levelToasts.filter((x) => x.key > seen);
    if (!fresh.length) return;
    setSeen(Math.max(...fresh.map((x) => x.key)));
    setShown((s) => [...s, ...fresh.map((x) => ({ key: x.key, level: x.level, ...rewardLabel(x.reward) }))]);
    for (const x of fresh) setTimeout(() => setShown((s) => s.filter((y) => y.key !== x.key)), 5200);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  if (!shown.length) return null;
  return (
    <div className="level-toasts" aria-live="polite">
      {shown.map((x) => (
        <div key={x.key} className="level-toast">
          <div className="lt-lvl">
            <em>{t("levelShort")}</em>
            <b>{x.level}</b>
          </div>
          <div className="lt-body">
            <em>{t("levelUp")}</em>
            <b>
              {x.icon} {x.text}
            </b>
          </div>
        </div>
      ))}
    </div>
  );
}
