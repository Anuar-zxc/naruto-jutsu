"use client";

import { useGame } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { JUTSU } from "@/lib/game/jutsu";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import { t, tr } from "@/lib/i18n";
import { HandPictogram } from "./HandPictogram";

/** Big "make THIS seal now" card. */
export function CurrentSeal() {
  useLang();
  const g = useGame();
  if (!g.jutsuId || (g.phase !== "PLAYING" && g.phase !== "COUNTDOWN")) return null;
  const j = JUTSU[g.jutsuId];
  const id = j.sequence[Math.min(g.seqIndex, j.sequence.length - 1)];
  const def = SIGNS[id];
  return (
    <div className="current-seal" key={`${id}-${g.seqIndex}`}>
      <div className="cs-label">{t("sealOf", { i: g.seqIndex + 1, n: j.sequence.length })}</div>
      <div className="cs-main">
        <div className="cs-kanji">{def.kanji}</div>
        <div>
          <div className="cs-name">{tr(def.name).toUpperCase()}</div>
          <div className="cs-how">{tr(def.howTo)}</div>
        </div>
      </div>
      <HandPictogram def={def} size={160} />
    </div>
  );
}
