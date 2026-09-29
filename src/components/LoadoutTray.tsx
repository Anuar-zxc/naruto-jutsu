"use client";

import { useEffect } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { JUTSU } from "@/lib/game/jutsu";
import { enraged } from "@/lib/game/gameState";
import { EFFECT_ICON, effectText, statusChips } from "@/lib/game/effects";
import { t, tr } from "@/lib/i18n";

/** The three jutsu of this fight (current / next), active buffs and the enemy's rage. */
export function LoadoutTray() {
  useLang();
  const g = useGame();
  const session = useSession();
  const canSwitch = g.phase === "COUNTDOWN" || (g.phase === "PLAYING" && g.seqIndex === 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (new URLSearchParams(location.search).has("synthetic")) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < g.loadout.length) session.dispatch({ type: "SELECT_SLOT", slot: i });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [g.loadout.length, session]);

  if (!g.loadout.length || g.mode === "training") return null;
  const next = (g.slot + 1) % g.loadout.length;
  const chips = statusChips(g.status);
  const rage = enraged(g);

  return (
    <div className="tray">
      <div className="tray-slots">
        {g.loadout.map((id, i) => {
          const j = JUTSU[id];
          const cur = i === g.slot && !!g.jutsuId;
          return (
            <button
              key={id}
              className={`tray-slot ${cur ? "cur" : ""} ${i === next && !cur ? "next" : ""} ${canSwitch ? "can" : ""}`}
              style={{ ["--el" as string]: j.color, ["--el-glow" as string]: j.glow }}
              onClick={() => {
                if (!canSwitch || i === g.slot) return;
                session.sfx.select();
                session.dispatch({ type: "SELECT_SLOT", slot: i });
              }}
              title={effectText(j)}
              data-tray={i}
            >
              <span className="ts-n">{i + 1}</span>
              <span className="ts-kanji">{j.kanji}</span>
              <span className="ts-body">
                <b>{tr(j.name)}</b>
                <em>
                  {EFFECT_ICON[j.effect.kind]} {effectText(j)}
                </em>
              </span>
              {i === next && !cur && <span className="ts-next">{t("nextUp")}</span>}
            </button>
          );
        })}
      </div>
      <div className="tray-status">
        {chips.map((c) => (
          <span key={c.key} className={`chip chip-${c.key}`}>
            {c.icon} {c.text}
          </span>
        ))}
        {rage && (
          <span className="chip chip-rage" title={t("rageTip")}>
            怒 {t("rage")}
          </span>
        )}
        {canSwitch && g.loadout.length > 1 && <span className="tray-hint">{t("switchHint")}</span>}
      </div>
    </div>
  );
}
