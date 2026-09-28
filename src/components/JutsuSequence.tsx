"use client";

import { useGame, useLive } from "@/hooks/useGame";
import { JUTSU } from "@/lib/game/jutsu";
import { SIGNS } from "@/lib/vision/gestureDefinitions";
import { HandPictogram } from "./HandPictogram";

/** Sequence strip: ✓ done · → current (with hold progress) · ○ pending, plus the timer. */
export function JutsuSequence() {
  const g = useGame();
  const live = useLive();
  if (!g.jutsuId) return null;
  const j = JUTSU[g.jutsuId];
  const active = g.phase === "PLAYING" || g.phase === "COUNTDOWN";
  const t = g.timeLeftMs / 1000;
  const urgent = g.phase === "PLAYING" && t <= 5;
  const pct = (g.timeLeftMs / j.timeLimitMs) * 100;

  return (
    <div className="sequence" style={{ ["--el" as string]: j.color, ["--el-glow" as string]: j.glow }}>
      <div className="seq-head">
        <span className="seq-kanji">{j.kanji}</span>
        <span className="seq-style">{j.style.toUpperCase()}</span>
        <span className="seq-name">{j.name}</span>
        <span className={`seq-timer ${urgent ? "urgent" : ""}`}>{active ? `${t.toFixed(1)}s` : ""}</span>
      </div>
      <div className={`timer-bar ${urgent ? "urgent" : ""}`}>
        <div className="timer-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="seq-cards">
        {j.sequence.map((id, i) => {
          const done = i < g.seqIndex;
          const current = i === g.seqIndex && g.phase === "PLAYING";
          const def = SIGNS[id];
          const hold = current && live.hold?.sign === id ? live.hold.progress : 0;
          return (
            <div key={`${id}-${i}`} className={`seal-card ${done ? "done" : ""} ${current ? "current" : ""}`}>
              <div className="seal-step">{done ? "✓" : current ? "→" : "○"}</div>
              <div className="seal-kanji">{def.kanji}</div>
              <div className="seal-name">{def.name.toUpperCase()}</div>
              <HandPictogram def={def} size={70} />
              {current && <div className="seal-hold" style={{ transform: `scaleX(${hold})` }} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
