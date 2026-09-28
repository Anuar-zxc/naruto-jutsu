"use client";

import { useEffect, useState, type RefObject } from "react";
import type { RecognitionFrame } from "@/types/gestures";
import { LONG_FINGERS } from "@/types/gestures";

/** Developer overlay (off by default; press D or add ?debug=1). */
export function DebugOverlay({ frameRef }: { frameRef: RefObject<RecognitionFrame | null> }) {
  const [f, setF] = useState<RecognitionFrame | null>(null);
  useEffect(() => {
    const id = setInterval(() => setF(frameRef.current), 120);
    return () => clearInterval(id);
  }, [frameRef]);
  if (!f) return <div className="debug">waiting for frames…</div>;
  return (
    <div className="debug">
      <div>
        FPS <b>{f.fps.toFixed(0)}</b> · hands <b>{f.features.hands.length}</b> · dist{" "}
        <b>{f.features.handDistance?.toFixed(2) ?? "—"}</b>
      </div>
      {f.features.hands.map((h) => (
        <div key={h.side} className="debug-hand">
          <div>
            {h.side.toUpperCase()} · palm {h.size.toFixed(3)} · angle {h.pointing.toFixed(0)}°
          </div>
          {(["thumb", ...LONG_FINGERS] as const).map((k) => (
            <div key={k} className="debug-row">
              <span>{k}</span>
              <div className="debug-bar">
                <div style={{ width: `${h.ext[k] * 100}%` }} />
              </div>
              <span>{h.ext[k].toFixed(2)}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="debug-scores">
        {f.scores.slice(0, 4).map((s) => (
          <div key={s.sign}>
            {s.sign} {(s.confidence * 100).toFixed(0)}%
          </div>
        ))}
      </div>
      <div>
        raw <b>{f.raw.sign ?? "UNKNOWN"}</b> · stable <b>{f.stable ?? "—"}</b> · hold{" "}
        <b>{f.hold ? `${f.hold.sign} ${(f.hold.progress * 100).toFixed(0)}%` : "—"}</b>
      </div>
    </div>
  );
}
