"use client";

import { forwardRef, useEffect, useRef, useState, type RefObject } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { useProfile } from "@/hooks/useProfile";
import { CHARACTERS } from "@/lib/game/characters";
import type { Location } from "@/lib/game/locations";
import { t, tr } from "@/lib/i18n";
import { SAGE_MAX, isBossWave } from "@/lib/game/gameState";
import { MUTATORS } from "@/lib/game/mutators";
import { MECHANICS } from "@/lib/game/bosses";
import { ITEMS } from "@/lib/game/items";
import { TITLES } from "@/lib/game/pass";
import { ArenaBackdrop } from "./ArenaBackdrop";
import { Portrait } from "./Portrait";

interface Props {
  heroRef: RefObject<HTMLDivElement | null>;
  location: Location;
  hitKey: number;
  damage: { amount: number; perfect: boolean; key: number } | null;
  enemyHit: { amount: number; key: number } | null;
  hpDelayMs: number;
  taunt: string | null;
}

/** Fighting-game health bar: drains toward the outer edge, with a red "ghost" of the chunk just lost. */
function FightBar({ hp, max, side, delayMs }: { hp: number; max: number; side: "l" | "r"; delayMs: number }) {
  const pct = Math.max(0, Math.min(100, (hp / max) * 100));
  return (
    <div className={`fb fb-${side} ${pct <= 25 ? "danger" : ""}`}>
      <i className="fb-ghost" style={{ width: `${pct}%`, transitionDelay: `${delayMs + 500}ms` }} />
      <i className="fb-fill" style={{ width: `${pct}%`, transitionDelay: `${delayMs}ms` }} />
      <span className="fb-num">{Math.ceil(Math.max(0, hp))}</span>
    </div>
  );
}

/**
 * Mortal-Kombat-style arena: two full-body fighters facing each other on the
 * location backdrop, health bars and a clock on top, an announcer in the middle.
 * The enemy sprite element is the forwarded ref (effects aim at it).
 */
export const BattleStage = forwardRef<HTMLDivElement, Props>(function BattleStage({ heroRef, location, hitKey, damage, enemyHit, hpDelayMs, taunt }, foeRef) {
  useLang();
  const g = useGame();
  const profile = useProfile();
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const boss = g.bossId ? CHARACTERS[g.bossId] : null;
  const shadow = !!boss && boss.id === hero?.id;
  const duel = g.mode === "duel";
  const party = g.party;
  const versus = party?.variant === "versus";
  const foeName = duel && g.duel ? g.duel.opponentNick : boss ? (shadow && !versus ? t("shadowOf", { name: tr(boss.name) }) : tr(boss.name)) : "???";
  const mech = g.mech.id ? MECHANICS[g.mech.id] : null;
  const gear = party ? [] : [profile.eye, profile.weapon].filter((x): x is NonNullable<typeof x> => !!x).map((id) => ITEMS[id]);
  const clock = g.phase === "PLAYING" ? Math.ceil(g.timeLeftMs / 1000) : g.phase === "COUNTDOWN" ? g.countdown : "∞";
  const urgent = g.phase === "PLAYING" && g.timeLeftMs <= 5000;
  const victory = g.phase === "VICTORY" || g.phase === "WAVE_CLEAR";
  const defeat = g.phase === "DEFEAT";

  return (
    <div className={`mk-stage ${victory ? "won" : ""} ${defeat ? "lost" : ""} ${g.mech.genjutsu && ["COUNTDOWN", "PLAYING"].includes(g.phase) ? "genjutsu" : ""} ${g.mech.shifted ? "shifted" : ""}`}>
      <ArenaBackdrop location={location} showName={false} />
      <div className="mk-vignette" aria-hidden />

      <div className="mk-top">
        <div className="mk-side l">
          {hero && <Portrait ch={hero} className="mk-face" />}
          <div className="mk-info">
            <FightBar hp={g.playerHp} max={g.playerMaxHp} side="l" delayMs={0} />
            <div className={`sage-bar ${g.sage >= SAGE_MAX ? "full" : ""}`} title={t("sageTip")} data-sage={g.sage}>
              <span className="sb-kanji">仙</span>
              <div className="sb-track">
                <i style={{ width: `${(g.sage / SAGE_MAX) * 100}%` }} />
              </div>
              {g.sage >= SAGE_MAX && <em>{t("sageReady")}</em>}
            </div>
            <div className="mk-name">
              {hero ? tr(hero.name).toUpperCase() : "—"}
              {party ? <em>{t("playerN", { n: party.turn + 1 })}</em> : profile.nick && <em>{profile.nick}</em>}
              {!party && profile.title && <i className="mk-title">{tr(TITLES[profile.title])}</i>}
              {gear.map((it) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={it.id} src={it.image} alt={tr(it.name)} title={tr(it.name)} className={`mk-gear ${it.slot}`} />
              ))}
            </div>
          </div>
        </div>
        <div className={`mk-clock ${urgent ? "urgent" : ""}`}>
          {g.mutators.length > 0 && (
            <div className="mk-mods">
              {g.mutators.map((id) => (
                <span key={id} title={tr(MUTATORS[id].desc)}>
                  {MUTATORS[id].kanji} {tr(MUTATORS[id].name)}
                </span>
              ))}
            </div>
          )}
          <b key={String(clock)}>{clock}</b>
          <span>
            {party ? t("playerTurnShort", { n: party.turn + 1 }) : g.mode === "survival" && g.survival ? `${t("wave")} ${g.survival.wave}` : `${t("round")} ${g.round}`}
          </span>
        </div>
        <div className="mk-side r">
          <div className="mk-info">
            <FightBar hp={g.bossHp} max={g.bossMaxHp} side="r" delayMs={hpDelayMs} />
            <div className="mk-name">
              {versus && party ? <em>{t("playerN", { n: 2 - party.turn })}</em> : boss && !duel && <em>{tr(boss.title)}</em>}
              {foeName.toUpperCase()}
            </div>
            {mech && (
              <div className={`mk-mech ${g.mech.genjutsu || g.mech.shifted ? "active" : ""}`} title={tr(mech.desc)} data-mech={mech.id}>
                <b>{mech.kanji}</b> {tr(mech.name)}
                <span>{tr(mech.desc)}</span>
              </div>
            )}
          </div>
          {boss && <Portrait ch={boss} className="mk-face" />}
        </div>
      </div>

      <div className="mk-arena">
        <div className="mk-floor" aria-hidden />
        <div ref={heroRef} className={`fighter f-hero ${defeat ? "ko" : ""} ${victory ? "win" : ""}`} style={hero ? { ["--aura" as string]: hero.color } : undefined}>
          <div className="f-shadow" />
          <div className={`f-body ${g.sage >= SAGE_MAX ? "sage" : ""}`}>{hero && <Portrait ch={hero} className="f-img" key={hero.id} />}</div>
          {enemyHit && (
            <div className="f-dmg bad" key={enemyHit.key}>
              −{enemyHit.amount}
            </div>
          )}
        </div>
        <div ref={foeRef} className={`fighter f-foe ${victory ? "ko" : ""} ${shadow ? "shadow" : ""}`} style={boss ? { ["--aura" as string]: boss.color } : undefined}>
          <div className="f-shadow" />
          <div className="f-in" key={boss?.id ?? "none"}>
            <div key={hitKey} className={`f-body ${hitKey ? "hit" : ""}`}>
              {boss && <Portrait ch={boss} className="f-img" flip key={boss.id} />}
            </div>
          </div>
          {taunt && (
            <div className="taunt mk-taunt" key={taunt}>
              {taunt}
            </div>
          )}
          {damage && (
            <div key={damage.key} className={`f-dmg ${damage.perfect ? "perfect" : ""}`}>
              {damage.perfect && <span className="dmg-tag">{t("perfect")}</span>}−{damage.amount}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

type Ann = { text: string; kind: string; key: number };

/** Round / Fight / Finish / K.O. / Flawless calls, plus the hit-combo counter. */
export function Announcer() {
  const g = useGame();
  const session = useSession();
  const prev = useRef(g);
  const finishCalled = useRef(false);
  const streak = useRef(0);
  const [ann, setAnn] = useState<Ann | null>(null);
  const [hits, setHits] = useState<{ n: number; key: number } | null>(null);
  const timers = useRef<number[]>([]);

  const say = (text: string, kind: string, ms: number, delay = 0, sound?: Parameters<typeof session.sfx.announce>[0]) => {
    timers.current.push(
      window.setTimeout(() => {
        setAnn({ text, kind, key: Date.now() });
        if (sound) session.sfx.announce(sound);
        timers.current.push(window.setTimeout(() => setAnn((a) => (a?.text === text ? null : a)), ms));
      }, delay),
    );
  };

  useEffect(() => () => timers.current.forEach((x) => clearTimeout(x)), []);

  useEffect(() => {
    const p = prev.current;
    prev.current = g;
    if (g.phase === p.phase && g.bossHp === p.bossHp && g.mech.event?.id === p.mech.event?.id) return;

    if (g.phase === "COUNTDOWN" && p.phase !== "COUNTDOWN") {
      if (g.round === 1) {
        finishCalled.current = false;
        streak.current = 0;
      }
      // Round 1 waits for the VS splash to clear.
      const afterVs = g.round === 1 && (p.phase === "JUTSU_SELECTION" || p.phase === "WAVE_CLEAR");
      const vsDelay = 1850;
      const wave = g.mode === "survival" && g.survival && g.round === 1 ? g.survival.wave : null;
      if (wave != null) say(isBossWave(wave) ? t("bossWave", { n: wave }) : `${t("wave")} ${wave}`, isBossWave(wave) ? "finish" : "round", 1300, afterVs ? vsDelay : 0, wave === 1 ? "round" : "fight");
      else say(`${t("round")} ${g.round}`, "round", 1100, afterVs ? vsDelay : 0, g.round === 1 ? "round" : undefined);
    }
    if (g.phase === "PLAYING" && p.phase === "COUNTDOWN" && g.round === 1) say(t("annFight"), "fight", 900, 0, "fight");
    if (g.phase === "JUTSU_CAST" && p.phase !== "JUTSU_CAST") {
      streak.current += 1;
      if (streak.current >= 2) setHits({ n: streak.current, key: Date.now() });
    }
    if ((g.phase === "FAILED" && p.phase !== "FAILED") || (g.lastEnemyHit && g.lastEnemyHit.id !== p.lastEnemyHit?.id)) streak.current = 0;
    if (!finishCalled.current && g.bossHp > 0 && g.bossHp <= g.bossMaxHp * 0.25 && p.bossHp > p.bossMaxHp * 0.25 && g.mode !== "training") {
      finishCalled.current = true;
      say(t("annFinish"), "finish", 1300, 900, "finish");
    }
    if (g.phase === "VICTORY" && p.phase !== "VICTORY") {
      say(t("annKo"), "ko", 1000, 500, "ko");
      const flawless = g.playerHp >= g.playerMaxHp;
      say(flawless ? t("annFlawless") : t("annWin"), flawless ? "flawless" : "win", 1400, 1550, flawless ? "flawless" : undefined);
    }
    if (g.phase === "DEFEAT" && p.phase !== "DEFEAT") say(t("annLose"), "lose", 1500, 250);
    const ev = g.mech.event;
    if (ev && ev.id !== p.mech.event?.id) {
      const text = { genjutsu: t("mechGenjutsu"), shift: t("mechShift"), shinra: t("mechShinra"), repelled: t("mechRepelled"), regen: t("mechRegen"), resisted: t("mechResisted"), heart: t("mechHeart") }[ev.kind];
      const delay = ev.kind === "genjutsu" || ev.kind === "shinra" ? (g.round === 1 ? 2000 : 250) : 400;
      say(text, "mech", 1500, delay, ev.kind === "shift" || ev.kind === "genjutsu" ? "finish" : undefined);
    }
    if (g.phase === "WAVE_CLEAR" && p.phase !== "WAVE_CLEAR") say(t("annKo"), "ko", 1100, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  return (
    <>
      {ann && (
        <div className={`mk-ann ${ann.kind}`} key={ann.key}>
          <span>{ann.text}</span>
        </div>
      )}
      {hits && (
        <div className="mk-hits" key={hits.key}>
          {t("annHits", { n: hits.n })}
        </div>
      )}
    </>
  );
}
