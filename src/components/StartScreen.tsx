"use client";

import { useEffect, useRef } from "react";
import { SIGN_LIST } from "@/lib/vision/gestureDefinitions";
import { PLAYABLE } from "@/lib/game/characters";
import { t, tr } from "@/lib/i18n";
import { useLang } from "@/hooks/useLang";
import { HandPictogram } from "./HandPictogram";
import { LangToggle } from "./LangToggle";
import { Portrait } from "./Portrait";

export function StartScreen({ onStart }: { onStart: () => void }) {
  useLang();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  const roster = PLAYABLE.filter((_, i) => i % 2 === 0).slice(0, 10);

  return (
    <main className="start">
      <Embers />
      <div className="start-bg" />
      <div className="start-watermark">忍術</div>
      <div className="start-roster" aria-hidden>
        {roster.map((c, i) => (
          <Portrait key={c.id} ch={c} className="roster-img" />
        ))}
      </div>
      <LangToggle className="start-lang" />
      <div className="start-inner">
        <div className="start-eyebrow">{t("eyebrow")}</div>
        <h1 className="start-title">
          SHINOBI<span>— JUTSU —</span>
        </h1>
        <p className="start-tagline">{t("tagline")}</p>
        <button className="btn primary cta" onClick={onStart} autoFocus>
          {t("cta")}
        </button>
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
        <div className="gallery-title">{t("twelveSeals")}</div>
        <div className="seal-gallery">
          {SIGN_LIST.map((s) => (
            <div key={s.id} className="gallery-item" title={tr(s.howTo)}>
              <HandPictogram def={s} size={58} />
              <span>
                {s.kanji} {tr(s.name).toUpperCase()}
              </span>
            </div>
          ))}
        </div>
        <p className="start-foot">{t("foot")}</p>
      </div>
    </main>
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
    const ps = Array.from({ length: reduce ? 20 : 90 }, () => spawn(true));
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
