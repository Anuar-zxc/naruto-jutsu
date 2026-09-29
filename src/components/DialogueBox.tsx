"use client";

import { useEffect, useState } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { CHARACTERS, mentorFor, type Character } from "@/lib/game/characters";
import { dialogueLines, locationFor } from "@/lib/game/gameState";
import { t, tr } from "@/lib/i18n";
import { ArenaBackdrop } from "./ArenaBackdrop";
import { Portrait } from "./Portrait";

const CHAR_MS = 22;

/**
 * Visual-novel style dialogue: the location as backdrop, both fighters on
 * stage (the speaker highlighted), a name plate and typewriter text.
 * Enter / Space / click → finish the line or go to the next one.
 */
export function DialogueBox() {
  useLang();
  const g = useGame();
  const session = useSession();
  const lines = dialogueLines(g);
  const line = g.dialogue ? lines[g.dialogue.index] : null;
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const mentor = CHARACTERS[mentorFor(g.characterId)];
  const enemy = g.bossId ? CHARACTERS[g.bossId] : null;
  const sameAsHero = !!enemy && !!hero && enemy.id === hero.id;

  const nameOf = (c: Character | null) => (c ? tr(c.name) : "");
  const enemyName = enemy ? (sameAsHero ? t("shadowOf", { name: tr(enemy.name) }) : tr(enemy.name)) : "";
  const ally = line?.speaker === "ally" && line.who ? CHARACTERS[line.who] : null;
  const speaker: Character | null = !line ? null : line.speaker === "hero" ? hero : line.speaker === "mentor" ? mentor : line.speaker === "enemy" ? enemy : ally;
  const speakerName = !line ? "" : line.speaker === "narrator" ? t("narrator") : line.speaker === "enemy" ? enemyName : nameOf(speaker);
  const text = line ? tr(line.text, { hero: nameOf(hero), mentor: nameOf(mentor), enemy: enemyName }) : "";

  const [shown, setShown] = useState(0);
  const key = `${g.dialogue?.part}-${g.dialogue?.index}-${text}`;
  useEffect(() => {
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= text.length ? n : n + 1)), CHAR_MS);
    return () => clearInterval(id);
  }, [key, text.length]);

  const done = shown >= text.length;
  const advance = () => {
    if (!done) return setShown(text.length);
    session.sfx.tick();
    session.dispatch({ type: "DIALOGUE_NEXT" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
      if (e.key === "Escape") session.dispatch({ type: "DIALOGUE_SKIP" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!line) return null;
  const leftActive = line.speaker === "hero";
  // Right side: whoever speaks to the hero (mentor, ally, enemy); the narrator keeps the last one on stage.
  const rightChar = line.speaker === "mentor" ? mentor : ally ?? enemy;
  const rightActive = line.speaker === "mentor" || line.speaker === "enemy" || line.speaker === "ally";

  return (
    <div className="dialogue" onClick={advance} role="dialog" aria-live="polite">
      <ArenaBackdrop location={locationFor(g)} />
      <div className="dlg-stage">
        {hero && <Portrait ch={hero} className={`dlg-actor left ${leftActive ? "active" : ""}`} />}
        {rightChar && <Portrait key={rightChar.id} ch={rightChar} className={`dlg-actor right ${rightActive ? "active" : ""}`} flip={sameAsHero && rightChar === enemy} />}
      </div>
      <div className="dlg-box" style={{ ["--hero" as string]: speaker?.color ?? "#9a93a0" }}>
        <div className={`dlg-name ${line.speaker === "narrator" ? "narrator" : ""}`}>{speakerName}</div>
        <div className="dlg-text">
          {text.slice(0, shown)}
          {!done && <span className="dlg-caret">▌</span>}
        </div>
        <div className="dlg-foot">
          <span>
            {g.dialogue!.index + 1} / {lines.length} · {t("continueHint")}
          </span>
          <button
            className="btn ghost small"
            onClick={(e: { stopPropagation(): void }) => {
              e.stopPropagation();
              session.dispatch({ type: "DIALOGUE_SKIP" });
            }}
          >
            {t("skip")}
          </button>
        </div>
      </div>
    </div>
  );
}
