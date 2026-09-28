"use client";

import { useGame, useSession } from "@/hooks/useGame";
import { accuracy, rankFor, rankPoints } from "@/lib/game/scoring";
import { CHARACTERS } from "@/lib/game/characters";

const RANK_TEXT = { S: "LEGENDARY SHINOBI", A: "ELITE JŌNIN", B: "CHŪNIN", C: "GENIN — KEEP TRAINING" } as const;

export function ResultScreen({ onExit }: { onExit: () => void }) {
  const g = useGame();
  const session = useSession();
  const s = g.stats;
  const rank = rankFor(s);
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const foe = g.bossId ? CHARACTERS[g.bossId] : null;
  const rows: [string, string][] = [
    ["SCORE", s.score.toLocaleString("en-US")],
    ["ACCURACY", `${Math.round(accuracy(s) * 100)}%`],
    ["MAX COMBO", `${s.maxCombo}`],
    ["SEAL TIME", `${(s.playMs / 1000).toFixed(1)}s`],
    ["JUTSU CAST", `${s.castCount}${s.perfectCount ? ` (${s.perfectCount} perfect)` : ""}`],
    ["MISTAKES", `${s.mistakes}`],
  ];
  return (
    <div className="result">
      {hero && <img className="result-hero" src={hero.image} alt="" />}
      <div className="result-card">
        <div className="result-head">VICTORY</div>
        <div className="result-sub">{foe ? `${foe.name} has been defeated` : "The enemy has been defeated"}{hero ? ` by ${hero.name}.` : "."}</div>
        <div className={`rank rank-${rank}`}>{rank}</div>
        <div className="rank-text">
          {RANK_TEXT[rank]} · {rankPoints(s)} pts
        </div>
        <div className="result-grid">
          {rows.map(([k, v]) => (
            <div key={k} className="result-row">
              <span>{k}</span>
              <b>{v}</b>
            </div>
          ))}
        </div>
        <div className="result-actions">
          <button className="btn primary" onClick={() => session.dispatch({ type: "RESTART" })}>
            FIGHT AGAIN
          </button>
          <button className="btn ghost" onClick={onExit}>
            EXIT
          </button>
        </div>
      </div>
    </div>
  );
}

export function FailedPanel() {
  const session = useSession();
  return (
    <div className="modal">
      <div className="modal-card failed">
        <div className="failed-kanji">失</div>
        <div className="failed-title">JUTSU FAILED</div>
        <div className="failed-sub">Time ran out before the seals were complete. Your combo is broken.</div>
        <div className="result-actions">
          <button className="btn primary" onClick={() => session.dispatch({ type: "RETRY" })}>
            RETRY
          </button>
          <button className="btn ghost" onClick={() => session.dispatch({ type: "BACK_TO_SELECTION" })}>
            CHOOSE ANOTHER
          </button>
        </div>
      </div>
    </div>
  );
}
