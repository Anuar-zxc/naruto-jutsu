"use client";

/** Boss HP bar with a delayed "ghost" bar that shows the chunk just lost. */
export function HealthBar({ hp, max, delayMs = 0 }: { hp: number; max: number; delayMs?: number }) {
  const pct = Math.max(0, (hp / max) * 100);
  return (
    <div className={`hp ${pct < 30 ? "low" : ""}`}>
      <div className="hp-ghost" style={{ width: `${pct}%`, transitionDelay: `${delayMs + 450}ms` }} />
      <div className="hp-fill" style={{ width: `${pct}%`, transitionDelay: `${delayMs}ms` }} />
      <div className="hp-ticks" />
      <div className="hp-text">
        {Math.ceil(hp)} / {max}
      </div>
    </div>
  );
}
