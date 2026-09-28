"use client";

import { useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import type { GameMode } from "@/types/game";

export function ModeSelect() {
  useLang();
  const session = useSession();
  const pick = (mode: GameMode) => {
    session.sfx.unlock();
    session.sfx.select();
    session.dispatch({ type: "SELECT_MODE", mode });
  };
  return (
    <div className="select-overlay">
      <div className="select-title">{t("chooseMode")}</div>
      <div className="mode-cards">
        <button className="mode-card story" onClick={() => pick("story")} data-mode="story">
          <div className="mode-kanji">物語</div>
          <div className="mode-title">{t("storyTitle")}</div>
          <div className="mode-desc">{t("storyDesc")}</div>
        </button>
        <button className="mode-card quick" onClick={() => pick("quick")} data-mode="quick">
          <div className="mode-kanji">決闘</div>
          <div className="mode-title">{t("quickTitle")}</div>
          <div className="mode-desc">{t("quickDesc")}</div>
        </button>
      </div>
    </div>
  );
}
