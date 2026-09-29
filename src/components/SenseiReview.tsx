"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { useLang } from "@/hooks/useLang";
import { CHARACTERS, mentorFor } from "@/lib/game/characters";
import { askSensei, localReview, reviewRequest } from "@/lib/ai/sensei";
import { t, tr } from "@/lib/i18n";
import { Portrait } from "./Portrait";

/** Post-battle debrief from the mentor, written live by the alem.plus LLM. */
export function SenseiReview({ outcome }: { outcome: "victory" | "defeat" }) {
  useLang();
  const g = useGame();
  const mentor = CHARACTERS[mentorFor(g.characterId)];
  const [text, setText] = useState<string | null>(null);
  const [ai, setAi] = useState(false);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let alive = true;
    const snapshot = g;
    void askSensei(reviewRequest(snapshot, outcome), 10000).then((r) => {
      if (!alive) return;
      setAi(!!r);
      setText(r ?? localReview(snapshot, outcome));
    });
    return () => {
      alive = false;
    };
    // run once per result screen
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Typewriter.
  useEffect(() => {
    if (!text) return;
    setShown(0);
    const id = setInterval(() => setShown((n) => (n >= text.length ? (clearInterval(id), n) : n + 2)), 18);
    return () => clearInterval(id);
  }, [text]);

  return (
    <div className="sensei" data-ai={ai ? "1" : "0"}>
      <Portrait ch={mentor} className="sensei-img" />
      <div className="sensei-body">
        <div className="sensei-head">
          <span>{t("senseiReview", { name: tr(mentor.name) })}</span>
          {ai && <em className="ai-badge">alem.ai</em>}
        </div>
        {text ? (
          <p className="sensei-text">
            {text.slice(0, shown)}
            {shown < text.length && <span className="dlg-caret">▌</span>}
          </p>
        ) : (
          <p className="sensei-text thinking">
            {t("senseiThinking")}
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
