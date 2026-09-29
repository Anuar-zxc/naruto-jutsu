"use client";

import { useEffect, useRef, useState } from "react";
import type { Character } from "@/lib/game/characters";
import { tr } from "@/lib/i18n";

/**
 * Character artwork with graceful fallbacks: while `public/assets/characters/<id>.webp`
 * is still downloading (slow networks) or if it is missing, a stylised silhouette
 * with the character's glyph is shown in its place.
 */
export function Portrait({ ch, className = "", flip = false, lazy = false }: { ch: Character; className?: string; flip?: boolean; lazy?: boolean }) {
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    setLoaded(!!img && img.complete && img.naturalWidth > 0);
  }, [ch.image]);

  const silhouette = (
    <div className={`silhouette ${className}`} style={{ ["--hero" as string]: ch.color }} aria-label={tr(ch.name)}>
      <svg viewBox="0 0 120 200" aria-hidden>
        <defs>
          <radialGradient id={`sg-${ch.id}`} cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor={ch.color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={ch.color} stopOpacity="0" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="80" rx="58" ry="80" fill={`url(#sg-${ch.id})`} />
        <path d="M60 18c14 0 24 11 24 25s-10 26-24 26-24-12-24-26 10-25 24-25Zm-38 82c6-18 20-26 38-26s32 8 38 26l10 96H12l10-96Z" fill="#0a070d" stroke={ch.color} strokeOpacity="0.5" strokeWidth="1.5" />
      </svg>
      <span className="silhouette-glyph">{ch.glyph}</span>
    </div>
  );

  if (broken) return silhouette;
  return (
    <>
      {!loaded && silhouette}
      <img
        ref={ref}
        className={`${className} ${flip ? "flip" : ""}`}
        style={loaded ? undefined : { position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        src={ch.image}
        alt={tr(ch.name)}
        draggable={false}
        decoding="async"
        loading={lazy ? "lazy" : undefined}
        onLoad={() => setLoaded(true)}
        onError={() => setBroken(true)}
      />
    </>
  );
}
