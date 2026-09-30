"use client";

import { useEffect, useState } from "react";
import { useGame, useSession } from "@/hooks/useGame";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/hooks/useLang";
import { CHARACTERS } from "@/lib/game/characters";
import { locationFor } from "@/lib/game/gameState";
import { accuracy, rankFor } from "@/lib/game/scoring";
import { drawBattleCard } from "@/lib/card";
import { t, tr } from "@/lib/i18n";
import { FRAMES, TITLES } from "@/lib/game/pass";

/** "Battle card" button: draws a shareable PNG of the fight and shows it with a download link. */
export function ShareCard({ win }: { win: boolean }) {
  useLang();
  const g = useGame();
  const session = useSession();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);

  const hero = g.characterId ? CHARACTERS[g.characterId] : null;
  if (!hero) return null;
  const foe = g.bossId ? CHARACTERS[g.bossId] : null;
  const s = g.stats;
  const survival = g.mode === "survival" && g.survival;

  const make = async () => {
    setBusy(true);
    session.sfx.select();
    const blob = await drawBattleCard({
      heroName: tr(hero.name),
      heroImg: hero.image,
      heroColor: hero.color,
      foeName: foe ? tr(foe.name) : null,
      bg: locationFor(g).image ?? null,
      snapshot: session.snapshot,
      headline: survival ? `${t("wave")} ${Math.max(0, g.survival!.wave - 1)}` : win ? t("cardVictory") : t("cardDefeat"),
      sub: survival ? t("cardWaves") : foe ? `${t("cardVs")} ${tr(foe.name)}` : "",
      rank: win || survival ? rankFor(s) : null,
      stats: [
        [t("cardScore"), s.score.toLocaleString("en-US")],
        [t("cardAccuracy"), `${Math.round(accuracy(s) * 100)}%`],
        [t("cardCombo"), String(s.maxCombo)],
        [t("cardCast"), String(s.castCount)],
      ],
      nick: profile.nick,
      title: profile.title ? tr(TITLES[profile.title]) : null,
      frame: profile.frame ? { colors: FRAMES[profile.frame].colors, kanji: FRAMES[profile.frame].kanji } : null,
      mySealLabel: t("mySeal"),
      win,
    });
    setBusy(false);
    if (blob) setUrl(URL.createObjectURL(blob));
  };

  return (
    <>
      <button className="btn ghost share-btn" onClick={make} disabled={busy} data-action="share-card">
        {busy ? t("shareMaking") : t("shareCard")}
      </button>
      {url && (
        <div className="card-preview" onClick={() => setUrl(null)}>
          <div className="cp-box" onClick={(e: { stopPropagation(): void }) => e.stopPropagation()}>
            <img src={url} alt="" />
            <div className="cp-actions">
              <a className="btn primary" href={url} download={`naruto-jutsu-${hero.id}.png`} data-action="download-card">
                ⬇ PNG
              </a>
              <button className="btn ghost" onClick={() => setUrl(null)}>
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
