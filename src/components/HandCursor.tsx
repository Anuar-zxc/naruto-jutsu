"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { handControl } from "@/lib/vision/handPointer";
import type { HandFeatures } from "@/types/gestures";

const CLICKABLE = "button, a[href], [role=button], input, select, label, [data-hand-click]";
const PINCH_ON = 0.32;
const PINCH_OFF = 0.5;
const DWELL_MS = 1100;
const GAIN = 1.35;

/**
 * Finger cursor: the index fingertip moves an on-screen pointer; a pinch
 * (thumb to index) or holding still over a button for ~1 s clicks it.
 * Runs on requestAnimationFrame and writes the DOM directly — no React re-renders.
 */
export function HandCursor() {
  const g = useGame();
  const session = useSession();
  const on = useSyncExternalStore(handControl.subscribe, handControl.isOn, () => false);
  const active = on && handControl.activeIn(g.phase);
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let x = -100;
    let y = -100;
    let seen = false;
    let pinched = false;
    let hover: HTMLElement | null = null;
    let hoverSince = 0;
    let cooldownUntil = 0;

    const pickHand = (hands: HandFeatures[]) =>
      // Prefer a pointing hand (index out, others curled), else the larger one.
      hands.slice().sort((a, b) => b.ext.index - (b.ext.middle + b.ext.ring) / 2 - (a.ext.index - (a.ext.middle + a.ext.ring) / 2) || b.size - a.size)[0];

    const setHover = (el: HTMLElement | null) => {
      if (el === hover) return;
      hover?.classList.remove("hand-hover");
      // Let hover-driven UI (character preview, tooltips) react to the finger like to a mouse.
      hover?.dispatchEvent(new MouseEvent("mouseout", { bubbles: true, relatedTarget: el }));
      el?.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, relatedTarget: hover }));
      hover = el;
      hover?.classList.add("hand-hover");
      hoverSince = performance.now();
    };

    const click = (el: HTMLElement) => {
      cooldownUntil = performance.now() + 900;
      hoverSince = performance.now() + 900;
      session.sfx.unlock();
      session.sfx.click();
      dot.current?.classList.remove("clicked");
      void dot.current?.offsetWidth;
      dot.current?.classList.add("clicked");
      if (el instanceof HTMLInputElement && el.type === "text") el.focus();
      else el.click();
    };

    const loop = () => {
      raf = requestAnimationFrame(loop);
      const f = handControl.latest();
      const d = dot.current;
      if (!d) return;
      const hand = f && f.hands.length ? pickHand(f.hands) : null;
      // Only a pointing index finger drives the cursor, so resting hands never click anything.
      if (!f || !hand || !hand.screen?.length || hand.ext.index < 0.45) {
        if (seen) d.classList.add("gone");
        setHover(null);
        return;
      }
      const tip = hand.screen[8];
      const thumb = hand.screen[4];
      const nx = Math.min(1, Math.max(0, 0.5 + (tip.x / f.aspect - 0.5) * GAIN));
      const ny = Math.min(1, Math.max(0, 0.5 + (tip.y - 0.5) * GAIN));
      const tx = nx * window.innerWidth;
      const ty = ny * window.innerHeight;
      // Smooth: fast moves follow quickly, small jitters are damped.
      const k = seen ? Math.min(0.6, 0.18 + Math.hypot(tx - x, ty - y) / 600) : 1;
      x += (tx - x) * k;
      y += (ty - y) * k;
      seen = true;
      d.classList.remove("gone");
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`;

      const now = performance.now();
      const under = document.elementFromPoint(x, y) as HTMLElement | null;
      const target = (under?.closest(CLICKABLE) as HTMLElement | null) ?? null;
      const usable = target && !(target as HTMLButtonElement).disabled ? target : null;
      setHover(usable);

      const pinch = Math.hypot(tip.x - thumb.x, tip.y - thumb.y) / Math.max(0.02, hand.size);
      const wasPinched = pinched;
      pinched = pinched ? pinch < PINCH_OFF : pinch < PINCH_ON;
      d.classList.toggle("pinch", pinched);
      if (pinched && !wasPinched && usable && now > cooldownUntil) return click(usable);

      const dwell = usable ? Math.max(0, (now - hoverSince) / DWELL_MS) : 0;
      if (ring.current) ring.current.style.strokeDashoffset = String(100 - Math.min(1, dwell) * 100);
      if (usable && dwell >= 1 && now > cooldownUntil) click(usable);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      hover?.classList.remove("hand-hover");
    };
  }, [active, session]);

  if (!active) return null;
  return (
    <div ref={dot} className="hand-cursor gone" aria-hidden>
      <svg viewBox="0 0 40 40">
        <circle cx="20" cy="20" r="16" className="hc-track" />
        <circle ref={ring} cx="20" cy="20" r="16" className="hc-ring" pathLength={100} />
      </svg>
      <i className="hc-core" />
    </div>
  );
}
