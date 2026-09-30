"use client";

import { useEffect, useRef, useState } from "react";
import { SIGN_LIST } from "@/lib/vision/gestureDefinitions";
import { CHARACTERS } from "@/lib/game/characters";
import { useProfile } from "@/hooks/useProfile";
import { t, tr, type StrKey } from "@/lib/i18n";
import { useLang } from "@/hooks/useLang";
import { HandPictogram } from "./HandPictogram";
import { particleScale } from "@/lib/perf/quality";
import { LangToggle } from "./LangToggle";
import { Portrait } from "./Portrait";

export function StartScreen({ onStart }: { onStart: () => void }) {
  useLang();
  const profile = useProfile();
  const [showSeals, setShowSeals] = useState(false);
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  // Gentle mouse parallax on the key art.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onMove = (e: PointerEvent) => {
      const el = artRef.current;
      if (!el) return;
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  const trio = (["sasuke", "naruto-six-paths", "kakashi"] as const).map((id) => CHARACTERS[id]);
  const stats: [string, StrKey][] = [
    ["24", "statSeals"],
    ["12", "statJutsu"],
    ["13", "statChapters"],
    ["1v1", "statOnline"],
  ];

  return (
    <main className="start v10">
      <div className="start-bg" />
      <div className="start-moon" aria-hidden />
      <div className="start-fog" aria-hidden />
      <Embers />
      <Leaves />
      <div className="start-watermark">忍術</div>
      <LangToggle className="start-lang" />

      <section className="hero">
        <div className="hero-copy">
          <div className="start-eyebrow">{t("eyebrow")}</div>
          <h1 className="hero-title">
            <span className="ht-top">NARUTO</span>
            <span className="ht-bottom">
              <i>忍術</i> JUTSU
            </span>
          </h1>
          <p className="start-tagline">{t("tagline")}</p>

          <div className="hero-cta">
            <button className="btn primary cta shine" onClick={onStart} autoFocus data-action="start">
              <span>{t("cta")}</span>
              <kbd>Enter</kbd>
            </button>
            <div className="hero-player">
              <b>{profile.nick}</b>
              <span className="purse-coin">両</span>
              <em>{profile.ryo.toLocaleString("en-US")}</em>
            </div>
          </div>

          <div className="hero-stats">
            {stats.map(([n, k], i) => (
              <div key={k} className="hs" style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
                <b>{n}</b>
                <span>{t(k)}</span>
              </div>
            ))}
          </div>

          <ol className="start-steps">
            <li>
              <b>1</b> {t("step1")}
            </li>
            <li>
              <b>2</b> {t("step2")}
            </li>
            <li>
              <b>3</b> {t("step3")}
            </li>
          </ol>
        </div>

        <div className="hero-art" ref={artRef} aria-hidden>
          <div className="ha-ring" />
          {trio.map((c, i) => (
            <Portrait key={c.id} ch={c} className={`ha-img ha-${i}`} />
          ))}
          <div className="ha-kanji">火</div>
        </div>
      </section>

      <section className="seal-section">
        <button className="gallery-title" onClick={() => setShowSeals((v) => !v)} aria-expanded={showSeals}>
          {t("twelveSeals")} <em className="gallery-plus">{t("specialSeals")}</em>
          <span className="gallery-toggle">{showSeals ? "▲" : "▼"}</span>
        </button>
        {showSeals && (
          <div className="seal-gallery">
            {SIGN_LIST.map((s, i) => (
              <div key={s.id} className="gallery-item" title={tr(s.howTo)} style={{ animationDelay: `${i * 0.02}s` }}>
                <HandPictogram def={s} size={54} />
                <span>
                  {s.kanji} {tr(s.name).toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="start-foot">{t("foot")}</p>
      </section>
    </main>
  );
}

/** Drifting leaves (Hidden Leaf!) over the title screen. */
function Leaves() {
  return (
    <div className="leaves" aria-hidden>
      {Array.from({ length: 14 }, (_, i) => (
        <i key={i} style={{ left: `${(i * 7.3 + 3) % 100}%`, animationDelay: `${(i * 1.7) % 12}s`, animationDuration: `${10 + (i % 5) * 2.5}s` }} />
      ))}
    </div>
  );
}

/** Rising embers behind the title. */
function Embers() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      c.width = window.innerWidth * dpr;
      c.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const spawn = (anywhere = false) => ({
      x: Math.random() * window.innerWidth,
      y: anywhere ? Math.random() * window.innerHeight : window.innerHeight + 10,
      r: 0.6 + Math.random() * 2.2,
      vy: 0.25 + Math.random() * 0.9,
      sway: Math.random() * Math.PI * 2,
      hue: Math.random() < 0.8 ? 18 + Math.random() * 20 : 200,
    });
    const ps = Array.from({ length: reduce ? 20 : Math.round(90 * particleScale()) }, () => spawn(true));
    const loop = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        p.y -= p.vy;
        p.sway += 0.01;
        p.x += Math.sin(p.sway) * 0.3;
        if (p.y < -10) ps[i] = spawn();
        const a = Math.min(1, p.y / window.innerHeight + 0.2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 60%, ${a * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return <canvas ref={ref} className="embers" aria-hidden />;
}
