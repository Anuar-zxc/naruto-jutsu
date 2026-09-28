"use client";

import { useLive } from "@/hooks/useGame";
import { SIGNS } from "@/lib/vision/gestureDefinitions";

/** "What the computer sees": detected seal + confidence + hands in view. */
export function GestureIndicator() {
  const live = useLive();
  const def = live.detected ? SIGNS[live.detected] : null;
  const pct = Math.round(live.confidence * 100);
  const match = live.expected && live.detected === live.expected;
  return (
    <div className={`detect-chip ${def ? "on" : ""} ${match ? "match" : ""}`}>
      <div className="detect-label">DETECTED</div>
      <div className="detect-sign">
        {def ? (
          <>
            <span className="detect-kanji">{def.kanji}</span>
            <span>{def.name.toUpperCase()}</span>
          </>
        ) : (
          <span className="detect-none">{live.hands === 0 ? "NO HANDS" : "NO SEAL"}</span>
        )}
      </div>
      <div className="detect-conf">
        <div className="conf-bar">
          <div className="conf-fill" style={{ width: `${def ? pct : Math.min(pct, 60)}%` }} />
        </div>
        <span>{def ? `${pct}%` : "—"}</span>
      </div>
    </div>
  );
}

export function HandsBadge() {
  const live = useLive();
  return (
    <div className="hands-badge" title="Hands in view">
      <span className={live.hands >= 1 ? "on" : ""}>✋</span>
      <span className={live.hands >= 2 ? "on" : ""}>✋</span>
    </div>
  );
}
