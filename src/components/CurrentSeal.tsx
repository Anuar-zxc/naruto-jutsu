"use client";

import { useGame } from "@/hooks/useGame";
import { JUTSU } from "@/lib/game/jutsu";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import { HandPictogram } from "./HandPictogram";

/** Big "make THIS seal now" card. */
export function CurrentSeal() {
  const g = useGame();
  if (!g.jutsuId || (g.phase !== "PLAYING" && g.phase !== "COUNTDOWN")) return null;
  const j = JUTSU[g.jutsuId];
  const id = j.sequence[Math.min(g.seqIndex, j.sequence.length - 1)];
  const def = SIGNS[id];
  return (
    <div className="current-seal" key={`${id}-${g.seqIndex}`}>
      <div className="cs-label">
        SEAL {g.seqIndex + 1} / {j.sequence.length}
      </div>
      <div className="cs-main">
        <div className="cs-kanji">{def.kanji}</div>
        <div>
          <div className="cs-name">{def.name.toUpperCase()}</div>
          <div className="cs-how">{def.howTo}</div>
        </div>
      </div>
      <HandPictogram def={def} size={170} />
    </div>
  );
}
