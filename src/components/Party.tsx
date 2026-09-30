"use client";

import { useEffect, useState } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { CHARACTERS } from "@/lib/game/characters";
import { JUTSU } from "@/lib/game/jutsu";
import { NAMED_COMBOS, teamCombo, type PartyVariant } from "@/lib/game/party";
import { t, tr } from "@/lib/i18n";
import { Portrait } from "./Portrait";

/** Main menu → Party: pick versus or co-op. */
export function PartySetup({ onClose }: { onClose: () => void }) {
  useLang();
  const session = useSession();
  const go = (variant: PartyVariant) => {
    session.sfx.unlock();
    session.sfx.detected();
    session.dispatch({ type: "SELECT_MODE", mode: "party", variant });
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "1") go("versus");
      if (e.key === "2") go("coop");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="select-overlay party-setup">
      <div className="ps-title">
        <span>宴</span>
        <div>
          <b>{t("partyTitle")}</b>
          <em>{t("partySub")}</em>
        </div>
      </div>
      <div className="ps-cards">
        <button className="ps-card versus" onClick={() => go("versus")} data-party="versus">
          <div className="psc-faces">
            <Portrait ch={CHARACTERS["naruto-six-paths"]} className="psc-img" />
            <b>VS</b>
            <Portrait ch={CHARACTERS.sasuke} className="psc-img flip" />
          </div>
          <h3>対決 {t("partyVersus")}</h3>
          <p>{t("partyVersusDesc")}</p>
          <kbd>1</kbd>
        </button>
        <button className="ps-card coop" onClick={() => go("coop")} data-party="coop">
          <div className="psc-faces">
            <Portrait ch={CHARACTERS["naruto-six-paths"]} className="psc-img" />
            <b>+</b>
            <Portrait ch={CHARACTERS.sasuke} className="psc-img flip" />
          </div>
          <h3>連携 {t("partyCoop")}</h3>
          <p>{t("partyCoopDesc")}</p>
          <ul className="ps-combos">
            {NAMED_COMBOS.map((c) => (
              <li key={c.combo.id}>
                <b>{tr(c.combo.name)}</b> <em>{tr(JUTSU[c.a].name)} + {tr(JUTSU[c.b].name)} · ×{c.combo.mult}</em>
              </li>
            ))}
          </ul>
          <kbd>2</kbd>
        </button>
      </div>
      <button className="btn ghost small" onClick={onClose}>
        {t("back")}
      </button>
    </div>
  );
}

/** Big "PLAYER 2 — your turn" card during the countdown, so the players swap at the camera. */
export function PartyTurn() {
  useLang();
  const g = useGame();
  if (!g.party || g.phase !== "COUNTDOWN" || g.party.heroes.length < 2) return null;
  const p = g.party;
  const hero = CHARACTERS[p.heroes[p.turn]];
  const prev = p.variant === "coop" && p.lastCast && p.lastCast.turn !== p.turn ? p.lastCast.jutsu : null;
  const next = g.jutsuId;
  const combo = prev && next ? teamCombo(prev, next) : null;
  return (
    <div className={`party-turn p${p.turn + 1}`} key={`${g.round}-${p.turn}`}>
      <Portrait ch={hero} className="pt-img" />
      <div className="pt-body">
        <em>{t("partyTurn")}</em>
        <b>{t("playerN", { n: p.turn + 1 })}</b>
        <span>{tr(hero.name)}</span>
        {combo && (
          <div className="pt-combo">
            {t("partyComboHint", { name: tr(combo.name), m: combo.mult })}
          </div>
        )}
      </div>
      <div className="pt-count">{g.countdown}</div>
    </div>
  );
}

/** Team technique banner (co-op). */
export function TeamComboBanner() {
  useLang();
  const g = useGame();
  const [show, setShow] = useState<{ key: number; name: string; kanji: string; a: string; b: string; m: number } | null>(null);
  const team = g.party?.team;
  useEffect(() => {
    if (!team) return;
    const c = teamCombo(team.a, team.b);
    if (!c) return;
    setShow({ key: team.eventId, name: tr(c.name), kanji: c.kanji, a: tr(JUTSU[team.a].name), b: tr(JUTSU[team.b].name), m: c.mult });
    const id = setTimeout(() => setShow(null), 2600);
    return () => clearTimeout(id);
  }, [team?.eventId]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null;
  return (
    <div className="team-banner" key={show.key}>
      <div className="tb-kanji">{show.kanji}</div>
      <b>{show.name}</b>
      <em>
        {show.a} + {show.b} · ×{show.m}
      </em>
      <span>{t("teamTech")}</span>
    </div>
  );
}

/** End of a party game. */
export function PartyResult({ onExit }: { onExit: () => void }) {
  useLang();
  const g = useGame();
  const session = useSession();
  const p = g.party;
  if (!p || p.heroes.length < 2) return null;
  const versus = p.variant === "versus";
  const winner = versus ? (p.winner ?? (g.phase === "VICTORY" ? p.turn : ((1 - p.turn) as 0 | 1))) : null;
  const won = g.phase === "VICTORY";
  return (
    <div className="result party-result">
      <div className="result-card pr-card">
        <div className="result-head">{versus ? t("partyWinner", { n: (winner ?? 0) + 1 }) : won ? t("partyTeamWin") : t("partyTeamLose")}</div>
        <div className="pr-players">
          {p.heroes.map((id, i) => (
            <div key={i} className={`pr-player ${versus && winner === i ? "win" : ""}`}>
              <Portrait ch={CHARACTERS[id]} className="pr-img" />
              <b>{t("playerN", { n: i + 1 })}</b>
              <span>{tr(CHARACTERS[id].name)}</span>
              <em>{t("partyDealt", { n: p.dealt[i] })}</em>
              {versus && winner === i && <i className="pr-crown">勝</i>}
            </div>
          ))}
        </div>
        {session.lastReward != null && (
          <div className="reward-line">
            <span className="purse-coin">両</span> {t("rewardLine", { n: session.lastReward })}
          </div>
        )}
        <div className="result-actions">
          <button className="btn primary" onClick={() => session.dispatch({ type: "RESTART" })} data-action="party-again">
            {t("partyAgain")}
          </button>
          <button className="btn ghost" onClick={() => session.dispatch({ type: "BACK_TO_MENU" })}>
            {t("toMenu")}
          </button>
          <button className="btn ghost" onClick={onExit}>
            {t("exit")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Online duel: two jutsu met mid-air. */
export function ClashBanner() {
  useLang();
  const g = useGame();
  const [show, setShow] = useState<{ key: number; a: string; b: string; n: number } | null>(null);
  useEffect(() => {
    if (!g.clash) return;
    const theirs = g.clash.theirs in JUTSU ? tr(JUTSU[g.clash.theirs as keyof typeof JUTSU].name) : g.clash.theirs;
    setShow({ key: g.clash.id, a: tr(JUTSU[g.clash.mine].name), b: theirs, n: g.clash.absorbed });
    const id = setTimeout(() => setShow(null), 2400);
    return () => clearTimeout(id);
  }, [g.clash?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!show) return null;
  return (
    <div className="clash-banner" key={show.key}>
      <b>{t("clashTitle")}</b>
      <em>
        {show.a} ⚡ {show.b}
      </em>
      <span>{t("clashAbsorbed", { n: show.n })}</span>
    </div>
  );
}
