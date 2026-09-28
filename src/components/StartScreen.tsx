"use client";

import { useEffect, useRef } from "react";
import { SIGN_LIST } from "@/lib/vision/gestureDefinitions";
import { HandPictogram } from "./HandPictogram";

export function StartScreen({ onStart }: { onStart: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onStart();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);

  return (
    <main className="start">
      <Embers />
      <div className="start-watermark">忍術</div>
      <div className="start-inner">
        <div className="start-eyebrow">A WEBCAM HAND-SIGN BATTLE</div>
        <h1 className="start-title">
          SHINOBI<span>— JUTSU —</span>
        </h1>
        <p className="start-tagline">YOUR HANDS ARE THE CONTROLLER</p>
        <button className="btn primary cta" onClick={onStart} autoFocus>
          ENTER THE SHINOBI TRIAL
        </button>
        <ol className="start-steps">
          <li>
            <b>1</b> Show both hands to the camera
          </li>
          <li>
            <b>2</b> Form the seals in order
          </li>
          <li>
            <b>3</b> Cast the jutsu, defeat the demon
          </li>
        </ol>
        <div className="seal-gallery">
          {SIGN_LIST.map((s) => (
            <div key={s.id} className="gallery-item" title={s.howTo}>
              <HandPictogram def={s} size={64} />
              <span>
                {s.kanji} {s.name.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
        <p className="start-foot">Runs entirely in your browser · camera frames never leave your device · best with a laptop webcam and good light</p>
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
    const ps = Array.from({ length: reduce ? 20 : 90 }, () => spawn(true));
    function spawn(anywhere = false) {
      return {
        x: Math.random() * window.innerWidth,
        y: anywhere ? Math.random() * window.innerHeight : window.innerHeight + 10,
        r: 0.6 + Math.random() * 2.2,
        vy: 0.25 + Math.random() * 0.9,
        sway: Math.random() * Math.PI * 2,
        hue: Math.random() < 0.8 ? 18 + Math.random() * 20 : 200,
      };
    }
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
