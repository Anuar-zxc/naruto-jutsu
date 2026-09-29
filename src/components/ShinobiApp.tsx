"use client";

import { useCallback, useEffect, useState } from "react";
import { initLang } from "@/lib/i18n";
import { CHARACTER_LIST } from "@/lib/game/characters";
import { SessionContext, useCreateSession } from "@/hooks/useGame";
import { useSyncExternalStore } from "react";
import { GameScreen } from "./GameScreen";
import { StartScreen } from "./StartScreen";

export default function ShinobiApp() {
  const session = useCreateSession();
  const phase = useSyncExternalStore(session.subscribe, () => session.getState().phase, () => "IDLE" as const);
  const [flags, setFlags] = useState({ synthetic: false, debug: false });

  useEffect(() => {
    initLang();
    // Warm the cache with every portrait right away, so select screens never show empty cards.
    for (const c of CHARACTER_LIST) {
      const img = new Image();
      img.decoding = "async";
      img.src = c.image;
    }
    session.loadProgress();
    session.loadRecords();
    session.loadProfile();
    // Tell the duel opponent we're gone when the tab closes.
    const bye = () => session.leaveRoom();
    window.addEventListener("pagehide", bye);
    return () => window.removeEventListener("pagehide", bye);
  }, [session]);

  const start = useCallback(() => {
    const q = new URLSearchParams(window.location.search);
    setFlags({ synthetic: q.has("synthetic"), debug: q.has("debug") });
    session.sfx.unlock();
    session.music.unlock();
    session.sfx.select();
    session.dispatch({ type: "START" });
  }, [session]);

  return (
    <SessionContext.Provider value={session}>
      {phase === "IDLE" ? (
        <StartScreen onStart={start} />
      ) : (
        <GameScreen synthetic={flags.synthetic} initialDebug={flags.debug} onExit={() => undefined} />
      )}
    </SessionContext.Provider>
  );
}
