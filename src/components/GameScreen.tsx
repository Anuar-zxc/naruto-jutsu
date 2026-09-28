"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useHandTracking } from "@/hooks/useHandTracking";
import { FxEngine } from "@/lib/fx/fxEngine";
import { trackFor } from "@/lib/audio/music";
import { PhaseTransition } from "./PhaseTransition";
import { JUTSU } from "@/lib/game/jutsu";
import { CHARACTERS } from "@/lib/game/characters";
import { TIMING } from "@/lib/game/session";
import { comboMultiplier } from "@/lib/game/combo";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import type { GameState } from "@/types/game";
import { Boss } from "./Boss";
import { ArenaBackdrop } from "./ArenaBackdrop";
import { CharacterSelect } from "./CharacterSelect";
import { ChapterSelect } from "./ChapterSelect";
import { DialogueBox } from "./DialogueBox";
import { ModeSelect } from "./ModeSelect";
import { Portrait } from "./Portrait";
import { locationFor } from "@/lib/game/gameState";
import { CHAPTERS } from "@/lib/game/story";
import { t, tr } from "@/lib/i18n";
import { useLang } from "@/hooks/useLang";
import { CameraView } from "./CameraView";
import { CurrentSeal } from "./CurrentSeal";
import { DebugOverlay } from "./DebugOverlay";
import { GameHUD } from "./GameHUD";
import { JutsuSelect } from "./JutsuSelect";
import { JutsuSequence } from "./JutsuSequence";
import { DefeatPanel, FailedPanel, ResultScreen } from "./ResultScreen";
import { Dojo } from "./Dojo";

const LS_MUTE = "shinobi.muted";
const LS_MUSIC = "shinobi.music";

function readMusic() {
  try {
    return localStorage.getItem(LS_MUSIC) !== "0";
  } catch {
    return true;
  }
}

function readMuted() {
  try {
    return localStorage.getItem(LS_MUTE) === "1";
  } catch {
    return false;
  }
}

export function GameScreen({ synthetic, initialDebug, onExit }: { synthetic: boolean; initialDebug: boolean; onExit: () => void }) {
  useLang();
  const session = useSession();
  const g = useGame();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const bossRef = useRef<HTMLDivElement>(null);
  const fxCanvas = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const fx = useRef<FxEngine | null>(null);
  const prev = useRef<GameState>(g);

  const { status, error, retry, lastFrame } = useHandTracking({ session, active: true, synthetic, videoRef, canvasRef });

  const [muted, setMuted] = useState(false);
  const [debug, setDebug] = useState(initialDebug);
  const [hitKey, setHitKey] = useState(0);
  const [damage, setDamage] = useState<{ amount: number; perfect: boolean; key: number } | null>(null);
  const [flash, setFlash] = useState<{ color: string; key: number } | null>(null);
  const [pop, setPop] = useState<{ kanji: string; points: number; mult: number; key: number } | null>(null);
  const [comboPop, setComboPop] = useState<{ mult: number; key: number } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [taunt, setTaunt] = useState<string | null>(null);
  const [musicOn, setMusicOn] = useState(true);
  const [enemyHit, setEnemyHit] = useState<{ amount: number; key: number } | null>(null);

  // --- setup ------------------------------------------------------------------
  useEffect(() => {
    const m = readMuted();
    const mu = readMusic();
    setMuted(m);
    setMusicOn(mu);
    session.sfx.setMuted(m);
    session.music.setEnabled(!m && mu);
  }, [session]);

  // Soundtrack follows the scene.
  const track = trackFor(g.phase, g.bossHp, g.bossMaxHp);
  useEffect(() => {
    if (track) void session.music.play(track);
    else session.music.stop();
  }, [track, session]);
  useEffect(() => () => session.music.stop(), [session]);

  useEffect(() => {
    if (!fxCanvas.current) return;
    const engine = new FxEngine(fxCanvas.current);
    fx.current = engine;
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      engine.destroy();
    };
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const n = !m;
      session.sfx.unlock();
      session.sfx.setMuted(n);
      session.music.setEnabled(!n && musicOn);
      try {
        localStorage.setItem(LS_MUTE, n ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return n;
    });
  }, [session, musicOn]);

  const toggleMusic = useCallback(() => {
    setMusicOn((on) => {
      const n = !on;
      session.music.unlock();
      session.music.setEnabled(n && !muted);
      try {
        localStorage.setItem(LS_MUSIC, n ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return n;
    });
  }, [session, muted]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") setDebug((d) => !d);
      if (e.key === "m" || e.key === "M") toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMute]);

  // --- helpers -------------------------------------------------------------------
  const center = (el: HTMLElement | null, yFrac = 0.5) => {
    const r = el?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height * yFrac } : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  };
  const shake = (strong = true) => {
    const el = rootRef.current;
    if (!el) return;
    el.classList.remove("shake", "shake-sm");
    void el.offsetWidth;
    el.classList.add(strong ? "shake" : "shake-sm");
  };

  // --- react to game events ------------------------------------------------------
  useEffect(() => {
    const p = prev.current;
    prev.current = g;
    const j = g.jutsuId ? JUTSU[g.jutsuId] : null;

    if (g.stats.correctSigns > p.stats.correctSigns && j) {
      const sign = j.sequence[g.seqIndex - 1];
      fx.current?.seal(center(panelRef.current, 0.42).x, center(panelRef.current, 0.42).y, j.element);
      const mult = comboMultiplier(g.stats.combo);
      setPop({ kanji: SIGNS[sign].kanji, points: g.lastPoints?.amount ?? 100, mult, key: g.eventId });
      if (g.stats.combo === 3 || g.stats.combo === 5) setComboPop({ mult, key: g.eventId });
    }
    // Dojo: a successful seal hold.
    if (g.training && p.training && g.training.hits > p.training.hits) {
      const c = center(panelRef.current, 0.42);
      fx.current?.seal(c.x, c.y, "chakra");
      const sign = g.training.sign;
      setPop({ kanji: SIGNS[sign].kanji, points: 0, mult: 1, key: g.eventId });
      if (g.training.mastered.length > p.training.mastered.length) {
        fx.current?.burst(c.x, c.y, { colors: ["#ffd166", "#ffffff", "#7cf2ff"], count: 120, speed: 10, size: 5, life: 60 });
        fx.current?.ring(c.x, c.y, "#ffd166", { speed: 12, width: 6, life: 30 });
      }
    }

    // Enemy counter-attack when a jutsu fails.
    if (g.lastEnemyHit && g.lastEnemyHit.id !== p.lastEnemyHit?.id) {
      const from = center(bossRef.current, 0.45);
      const to = center(panelRef.current, 0.45);
      fx.current?.projectile("chakra", from, to, 380, () => {
        fx.current?.burst(to.x, to.y, { colors: ["#ff2d55", "#8b0000", "#ffffff"], count: 90, speed: 12, size: 5, life: 45 });
        setFlash({ color: "#ff1a3c", key: Date.now() });
        setEnemyHit({ amount: g.lastEnemyHit!.amount, key: Date.now() });
        shake(true);
      });
    }

    if (g.stats.mistakes > p.stats.mistakes) {
      const c = center(panelRef.current, 0.42);
      fx.current?.mistake(c.x, c.y);
      shake(false);
    }

    // Enemy taunt when HP first drops below half (story mode).
    if (g.mode === "story" && g.chapter != null && p.bossHp > p.bossMaxHp / 2 && g.bossHp <= g.bossMaxHp / 2 && g.bossHp > 0) {
      const line = tr(CHAPTERS[g.chapter].taunt);
      setTimeout(() => setTaunt(line), 900);
      setTimeout(() => setTaunt(null), 4200);
    }

    if (g.phase === p.phase) return;

    if (g.phase === "SUCCESS" && j) {
      const c = center(panelRef.current, 0.45);
      fx.current?.charge(c.x, c.y, j.element);
      setFlash({ color: j.glow, key: Date.now() });
    }
    if (g.phase === "JUTSU_CAST" && j && g.lastCast) {
      const from = center(panelRef.current, 0.45);
      const to = center(bossRef.current, 0.45);
      const cast = g.lastCast;
      const fire = () =>
        fx.current?.projectile(j.element, from, to, j.element === "lightning" ? 900 : TIMING.castImpact, () => {
          setHitKey((k) => k + 1);
          setDamage({ amount: cast.damage, perfect: cast.perfect, key: Date.now() });
          setFlash({ color: j.color, key: Date.now() });
          shake(true);
        });
      // Lightning strikes at 30% of its duration; delay it so impact lines up with the hit sound.
      if (j.element === "lightning") setTimeout(fire, TIMING.castImpact - 270);
      else fire();
    }
    if (g.phase === "VICTORY") {
      const c = center(bossRef.current, 0.45);
      setTimeout(() => {
        fx.current?.burst(c.x, c.y, { colors: ["#ff2d55", "#ffb020", "#ffffff", "#5a0b2b"], count: 220, speed: 16, size: 7, life: 90 });
        fx.current?.ring(c.x, c.y, "#ffb020", { speed: 18, width: 10, life: 40 });
      }, 700);
      setTimeout(() => setShowResult(true), 2300);
    }
    if (g.phase === "DEFEAT") setTimeout(() => setShowResult(true), 1500);
    if (["JUTSU_SELECTION", "IDLE", "DIALOGUE", "CHAPTER_SELECT", "MODE_SELECT", "TRAINING", "COUNTDOWN"].includes(g.phase)) {
      setShowResult(false);
      setDamage(null);
      if (g.phase !== "JUTSU_SELECTION") setTaunt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [g]);

  const quit = () => {
    session.dispatch({ type: "QUIT" });
    onExit();
  };

  const j = g.jutsuId ? JUTSU[g.jutsuId] : null;
  const casting = g.phase === "SUCCESS" || g.phase === "JUTSU_CAST";
  const hpDelay = g.phase === "JUTSU_CAST" ? TIMING.castImpact : 0;
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const location = locationFor(g);

  return (
    <div ref={rootRef} className="game" style={j ? { ["--el" as string]: j.color, ["--el-glow" as string]: j.glow } : undefined}>
      <div className="game-bg">
        <ArenaBackdrop location={location} showName={false} />
      </div>
      <GameHUD muted={muted} onToggleMute={toggleMute} musicOn={musicOn} onToggleMusic={toggleMusic} debug={debug} onToggleDebug={() => setDebug((d) => !d)} onQuit={quit} />

      <div className="game-main">
        <section className="col-camera">
          <CameraView videoRef={videoRef} canvasRef={canvasRef} panelRef={panelRef} status={status} error={error} retry={retry} synthetic={synthetic} />
          {pop && (
            <div className="seal-pop" key={pop.key}>
              <span className="sp-kanji">{pop.kanji}</span>
              {pop.points > 0 && (
                <span className="sp-points">
                  +{pop.points}
                  {pop.mult > 1 && <em> ×{pop.mult}</em>}
                </span>
              )}
            </div>
          )}
          {enemyHit && (
            <div className="enemy-hit" key={enemyHit.key}>
              −{enemyHit.amount}
            </div>
          )}
          {comboPop && (
            <div className="combo-pop" key={`c${comboPop.key}`}>
              {t("combo")} ×{comboPop.mult}
            </div>
          )}
          {debug && <DebugOverlay frameRef={lastFrame} />}
        </section>

        <section className="col-side">
          {g.phase === "TRAINING" ? (
            <Dojo />
          ) : (
          <>
          <Boss
            ref={bossRef}
            bossId={g.bossId}
            heroId={g.characterId}
            location={location}
            hp={g.bossHp}
            maxHp={g.bossMaxHp}
            hitKey={hitKey}
            damage={damage}
            defeated={g.phase === "VICTORY"}
            hpDelayMs={hpDelay}
            taunt={taunt}
          />
          <CurrentSeal />
          </>
          )}
          {(g.phase === "CAMERA_CHECK" || g.phase === "READY") && (
            <div className="side-note">{t("sideNote")}</div>
          )}
        </section>
      </div>

      <footer className="game-bottom">
        <JutsuSequence />
      </footer>

      {g.phase === "MODE_SELECT" && <ModeSelect />}
      {g.phase === "CHARACTER_SELECT" && <CharacterSelect />}
      {g.phase === "CHAPTER_SELECT" && <ChapterSelect />}
      {g.phase === "DIALOGUE" && <DialogueBox />}
      {g.phase === "JUTSU_SELECTION" && <JutsuSelect />}
      {g.phase === "FAILED" && <FailedPanel />}
      {casting && j && (
        <div className="cast-banner">
          {hero && <Portrait ch={hero} className="cb-hero" />}
          <div className="cb-kanji">{j.kanji}</div>
          <div className="cb-title">{g.phase === "SUCCESS" ? t("jutsuCast") : tr(j.name).toUpperCase()}</div>
          {g.phase === "JUTSU_CAST" && g.lastCast?.perfect && <div className="cb-perfect">{t("perfectJutsu", { n: g.lastCast.perfectBonus })}</div>}
          {g.phase === "JUTSU_CAST" && g.lastCast && g.lastCast.speedBonus > 0 && <div className="cb-bonus">{t("speedBonus", { n: g.lastCast.speedBonus })}</div>}
        </div>
      )}
      {g.phase === "NEXT_ROUND" && (
        <div className="round-banner" key={g.round}>
          {t("round")} {g.round + 1}
        </div>
      )}
      {g.phase === "VICTORY" && showResult && <ResultScreen onExit={quit} />}
      {g.phase === "DEFEAT" && showResult && <DefeatPanel onExit={quit} />}
      {g.phase === "DEFEAT" && <div className="defeat-vignette" aria-hidden />}

      <PhaseTransition phase={g.phase} />
      {flash && <div className="flash" key={flash.key} style={{ background: flash.color }} />}
      <canvas ref={fxCanvas} className="fx-canvas" aria-hidden />
    </div>
  );
}
