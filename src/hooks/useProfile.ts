"use client";

import { useSyncExternalStore } from "react";
import { useSession } from "./useGame";

export function useProfile() {
  const s = useSession();
  return useSyncExternalStore(s.subscribeProfile, s.getProfile, s.getProfile);
}

export function useDuel() {
  const s = useSession();
  return useSyncExternalStore(s.subscribeDuel, s.getDuel, s.getDuel);
}
