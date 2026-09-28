"use client";

import { createContext, useContext, useState, useSyncExternalStore } from "react";
import { GameSession, type LiveHud } from "@/lib/game/session";
import type { GameState } from "@/types/game";

export const SessionContext = createContext<GameSession | null>(null);

/** One GameSession per page load. */
export function useCreateSession(): GameSession {
  const [s] = useState(() => new GameSession());
  return s;
}

export function useSession(): GameSession {
  const s = useContext(SessionContext);
  if (!s) throw new Error("GameSession missing");
  return s;
}

/** Game state (rarely changes). */
export function useGame(): GameState {
  const s = useSession();
  return useSyncExternalStore(s.subscribe, s.getState, s.getState);
}

/** Live HUD data (throttled camera-rate updates). */
export function useLive(): LiveHud {
  const s = useSession();
  return useSyncExternalStore(s.subscribeLive, s.getLive, s.getLive);
}
