"use client";

import { useEffect, useRef, useState } from "react";
import type { Phase } from "@/types/game";

/** Kanji flashed during the ink wipe into each major scene. */
const SCENE_KANJI: Partial<Record<Phase, string>> = {
  MODE_SELECT: "道",
  CHARACTER_SELECT: "忍",
  CHAPTER_SELECT: "章",
  DIALOGUE: "語",
  JUTSU_SELECTION: "術",
  VICTORY: "勝",
};

/**
 * Cinematic ink-brush wipe between major scenes. Purely decorative:
 * pointer-events are disabled and it never blocks input.
 */
export function PhaseTransition({ phase }: { phase: Phase }) {
  const prev = useRef<Phase>(phase);
  const [wipe, setWipe] = useState<{ key: number; kanji: string } | null>(null);

  useEffect(() => {
    const from = prev.current;
    prev.current = phase;
    const kanji = SCENE_KANJI[phase];
    if (!kanji || from === phase) return;
    // Don't wipe between rounds of the same fight.
    if (phase === "JUTSU_SELECTION" && (from === "NEXT_ROUND" || from === "FAILED" || from === "COUNTDOWN")) return;
    setWipe({ key: Date.now(), kanji });
    const id = setTimeout(() => setWipe(null), 950);
    return () => clearTimeout(id);
  }, [phase]);

  if (!wipe) return null;
  return (
    <div className="ink-wipe" key={wipe.key} aria-hidden>
      <div className="ink-band" />
      <div className="ink-kanji">{wipe.kanji}</div>
    </div>
  );
}
