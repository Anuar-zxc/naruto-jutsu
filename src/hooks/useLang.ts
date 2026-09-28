"use client";

import { useSyncExternalStore } from "react";
import { getLang, subscribeLang } from "@/lib/i18n";

/** Subscribe a component to language changes. */
export function useLang() {
  return useSyncExternalStore(subscribeLang, getLang, () => "ru" as const);
}
