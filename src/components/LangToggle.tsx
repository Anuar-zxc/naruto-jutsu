"use client";

import { useLang } from "@/hooks/useLang";
import { setLang } from "@/lib/i18n";

export function LangToggle({ className = "" }: { className?: string }) {
  const lang = useLang();
  return (
    <div className={`lang-toggle ${className}`} role="group" aria-label="Language">
      {(["ru", "en"] as const).map((l) => (
        <button key={l} className={lang === l ? "on" : ""} onClick={() => setLang(l)} aria-pressed={lang === l}>
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
