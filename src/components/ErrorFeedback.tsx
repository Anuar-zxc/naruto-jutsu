"use client";

import { useLive } from "@/hooks/useGame";

/** ERROR MODE banner: one concrete correction at a time. */
export function ErrorFeedback() {
  const { feedback } = useLive();
  if (!feedback) return null;
  return (
    <div key={feedback.key} className={`feedback ${feedback.tone}`} role="status" aria-live="polite">
      <div className="feedback-title">
        {feedback.tone === "error" ? "⚠ " : "➜ "}
        {feedback.title}
      </div>
      <div className="feedback-msg">{feedback.message}</div>
    </div>
  );
}
