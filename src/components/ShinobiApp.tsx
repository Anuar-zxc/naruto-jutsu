"use client";

import { useCallback, useEffect, useState } from "react";
import { initLang } from "@/lib/i18n";
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
    session.loadProgress();
  }, [session]);

  const start = useCallback(() => {
    const q = new URLSearchParams(window.location.search);
    setFlags({ synthetic: q.has("synthetic"), debug: q.has("debug") });
    session.sfx.unlock();
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
