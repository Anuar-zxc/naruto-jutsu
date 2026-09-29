"use client";

import { useState } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useDuel, useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { CHARACTERS } from "@/lib/game/characters";
import { normalizeCode } from "@/lib/net/transport";
import { t, tr, type StrKey } from "@/lib/i18n";
import { Portrait } from "./Portrait";

const ERR: Record<string, StrKey> = { taken: "errTaken", "not-found": "errNotFound", timeout: "errNotFound", network: "errNetwork", left: "errLeft" };

/** Online duel lobby: create a room (show the code) or join one by code. */
export function Lobby() {
  useLang();
  const g = useGame();
  const duel = useDuel();
  const profile = useProfile();
  const session = useSession();
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  const busy = duel.status === "hosting" || duel.status === "joining" || duel.status === "connected";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(duel.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className="select-overlay lobby">
      <div className="select-title">
        <span>対戦</span>
        {t("lobbyTitle")}
      </div>

      <div className="lobby-me">
        {hero && <Portrait ch={hero} className="lobby-hero" />}
        <div>
          <b>{profile.nick}</b>
          <span>{hero ? tr(hero.name) : ""}</span>
        </div>
      </div>

      {duel.status === "hosting" && duel.code ? (
        <div className="lobby-room">
          <div className="lobby-label">{t("roomCode")}</div>
          <div className="lobby-code" data-code={duel.code}>
            {duel.code}
          </div>
          <button className="btn ghost small" onClick={copy}>
            {copied ? t("copied") : t("copy")}
          </button>
          <p className="lobby-hint">{t("shareCode")}</p>
          <div className="lobby-wait">
            <span className="spinner small" /> {t("waitingFriend")}
          </div>
        </div>
      ) : duel.status === "joining" || (duel.status === "hosting" && !duel.code) ? (
        <div className="lobby-wait">
          <span className="spinner small" /> {t("connecting")}
        </div>
      ) : (
        <div className="lobby-actions">
          <button className="btn primary" onClick={() => void session.hostRoom()} data-action="create-room">
            {t("createRoom")}
          </button>
          <div className="lobby-or">{t("orJoin")}</div>
          <form
            className="lobby-join"
            onSubmit={(e: { preventDefault(): void }) => {
              e.preventDefault();
              void session.joinRoom(code);
            }}
          >
            <input
              value={code}
              onChange={(e: { target: { value: string } }) => setCode(normalizeCode(e.target.value))}
              placeholder={t("codePlaceholder")}
              maxLength={5}
              autoCapitalize="characters"
              spellCheck={false}
              data-input="room-code"
            />
            <button className="btn" type="submit" disabled={code.length !== 5 || busy} data-action="join-room">
              {t("joinRoom")}
            </button>
          </form>
        </div>
      )}

      {duel.status === "error" && duel.error && <div className="lobby-error">{t(ERR[duel.error] ?? "errNetwork")}</div>}

      <p className="lobby-rules">{t("duelRules")}</p>

      <div className="chapter-actions">
        <button
          className="btn ghost small"
          onClick={() => {
            session.leaveRoom();
            session.dispatch({ type: "BACK_TO_MENU" });
          }}
        >
          {t("back")}
        </button>
      </div>
    </div>
  );
}
