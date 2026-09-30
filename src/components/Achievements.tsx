"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { ACHIEVEMENTS, ACH_CATS, type AchCategory } from "@/lib/game/achievements";
import { t, tr } from "@/lib/i18n";

/** Full-screen achievements board, grouped by category, with progress bars. */
export function Achievements({ onClose }: { onClose: () => void }) {
  useLang();
  const session = useSession();
  useSyncExternalStore(session.subscribeAch, session.getAchVersion, () => 0);
  const [cat, setCat] = useState<AchCategory | "all">("all");
  const c = session.getCounters();
  const done = ACHIEVEMENTS.filter((a) => session.isUnlocked(a.id));
  const earned = done.reduce((sum, a) => sum + a.reward, 0);
  const list = ACHIEVEMENTS.filter((a) => cat === "all" || a.cat === cat).sort((a, b) => Number(session.isUnlocked(b.id)) - Number(session.isUnlocked(a.id)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="select-overlay ach-screen">
      <header className="ach-head">
        <div className="ach-title">
          <span className="ach-kanji">実績</span>
          <div>
            <b>{t("achTitle")}</b>
            <em>{t("achTotal", { n: done.length, m: ACHIEVEMENTS.length, r: earned.toLocaleString("en-US") })}</em>
          </div>
        </div>
        <div className="ach-meter">
          <i style={{ width: `${(done.length / ACHIEVEMENTS.length) * 100}%` }} />
        </div>
        <nav className="ach-tabs">
          <button className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>
            ★
          </button>
          {ACH_CATS.map((k) => (
            <button key={k.id} className={cat === k.id ? "on" : ""} onClick={() => setCat(k.id)}>
              {tr(k.name)}
            </button>
          ))}
        </nav>
      </header>
      <div className="ach-grid">
        {list.map((a, i) => {
          const [cur, target] = a.progress(c);
          const ok = session.isUnlocked(a.id);
          return (
            <div key={a.id} className={`ach-card ${ok ? "ok" : ""}`} style={{ animationDelay: `${Math.min(i, 20) * 0.02}s` }} data-ach={a.id}>
              <div className="ac-seal">{a.kanji}</div>
              <div className="ac-body">
                <b>{tr(a.name)}</b>
                <span>{tr(a.desc)}</span>
                {!ok && target > 1 && (
                  <div className="ac-bar">
                    <i style={{ width: `${(cur / target) * 100}%` }} />
                    <em>
                      {cur.toLocaleString("en-US")} / {target.toLocaleString("en-US")}
                    </em>
                  </div>
                )}
              </div>
              <div className="ac-reward">
                <span className="purse-coin">両</span>
                {a.reward}
                {ok && <i>✓</i>}
              </div>
            </div>
          );
        })}
      </div>
      <button className="btn ghost small" onClick={onClose} data-action="close-ach">
        {t("back")}
      </button>
    </div>
  );
}

/** Pops a banner whenever an achievement unlocks, anywhere in the game. */
export function AchievementToasts() {
  useLang();
  const session = useSession();
  const v = useSyncExternalStore(session.subscribeAch, session.getAchVersion, () => 0);
  const [shown, setShown] = useState<{ key: number; kanji: string; name: string; reward: number }[]>([]);
  const [seen, setSeen] = useState(0);
  useEffect(() => {
    const fresh = session.achToasts.filter((x) => x.key > seen);
    if (!fresh.length) return;
    setSeen(Math.max(...fresh.map((x) => x.key)));
    setShown((s) => [...s, ...fresh.map((x) => ({ key: x.key, kanji: x.ach.kanji, name: tr(x.ach.name), reward: x.ach.reward }))]);
    for (const x of fresh) setTimeout(() => setShown((s) => s.filter((y) => y.key !== x.key)), 4800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  if (!shown.length) return null;
  return (
    <div className="ach-toasts" aria-live="polite">
      {shown.map((x) => (
        <div key={x.key} className="ach-toast">
          <div className="at-seal">{x.kanji}</div>
          <div className="at-body">
            <em>🏆 {t("achUnlocked")}</em>
            <b>{x.name}</b>
          </div>
          <div className="at-reward">
            +{x.reward} <span className="purse-coin">両</span>
          </div>
        </div>
      ))}
    </div>
  );
}
