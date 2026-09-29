"use client";

import type { RefObject } from "react";
import { useGame, useLive } from "@/hooks/useGame";
import type { TrackingStatus } from "@/hooks/useHandTracking";
import type { CameraErrorKind } from "@/lib/vision/handTracker";
import { t } from "@/lib/i18n";
import { useLang } from "@/hooks/useLang";
import { GestureIndicator, HandsBadge } from "./GestureIndicator";
import { ErrorFeedback } from "./ErrorFeedback";
import { useEffect, useState } from "react";
import type { StrKey } from "@/lib/i18n";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  panelRef: RefObject<HTMLDivElement | null>;
  status: TrackingStatus;
  error: CameraErrorKind | null;
  retry: () => void;
  synthetic: boolean;
}

export function CameraView({ videoRef, canvasRef, panelRef, status, error, retry, synthetic }: Props) {
  useLang();
  const game = useGame();
  const live = useLive();
  const phase = game.phase;

  return (
    <div ref={panelRef} className={`camera-panel phase-${phase.toLowerCase()}`}>
      <video ref={videoRef} className="camera-video" playsInline muted autoPlay />
      {synthetic && <div className="synthetic-bg" />}
      <canvas ref={canvasRef} className="camera-canvas" />
      <div className="camera-vignette" />
      <div className="corner tl" />
      <div className="corner tr" />
      <div className="corner bl" />
      <div className="corner br" />

      {status === "running" && (
        <>
          <GestureIndicator />
          <HandsBadge />
          <ErrorFeedback />
        </>
      )}
      {synthetic && <div className="synthetic-tag">{t("syntheticTag")}</div>}

      {status === "loading" && (
        <div className="camera-center">
          <Shuriken />
          <div className="camera-msg">{t("loading")}</div>
          <div className="camera-sub">{t("loadingSub")}</div>
          <LoadingTip />
        </div>
      )}

      {status === "error" && error && (
        <div className="camera-center error">
          <div className="big-icon">⛩</div>
          <div className="camera-msg">{t(`err_${error}`)}</div>
          <div className="camera-sub">{error === "denied" ? t("errSubDenied") : t("errSubOther")}</div>
          <button className="btn" onClick={retry}>
            {t("tryAgain")}
          </button>
        </div>
      )}

      {status === "running" && phase === "CAMERA_CHECK" && (
        <div className="calibration">
          <div className="calib-title">{t("cameraCheck")}</div>
          <div className="calib-hands">
            <span className={live.hands >= 1 ? "on" : ""}>✋</span>
            <span className={live.hands >= 2 ? "on" : ""}>✋</span>
          </div>
          <div className="calib-msg">{live.calibration > 0 ? t("holdStill") : t("placeHands")}</div>
          <div className="calib-bar">
            <div className="calib-fill" style={{ width: `${live.calibration * 100}%` }} />
          </div>
        </div>
      )}

      {phase === "READY" && (
        <div className="stamp">
          <div className="stamp-kanji">忍</div>
          <div className="stamp-text">{t("shinobiDetected")}</div>
        </div>
      )}

      {phase === "COUNTDOWN" && (
        <div className="countdown" key={game.countdown}>
          <span className="cd-kanji">{["", "一", "二", "三"][game.countdown] ?? ""}</span>
          {game.countdown}
        </div>
      )}
    </div>
  );
}

/** Spinning shuriken loader (pure SVG + CSS). */
export function Shuriken({ size = 64 }: { size?: number }) {
  return (
    <svg className="shuriken" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <path d="M50 4 L58 42 L96 50 L58 58 L50 96 L42 58 L4 50 L42 42 Z" />
      <circle cx="50" cy="50" r="7" />
    </svg>
  );
}

const TIPS: StrKey[] = ["tip1", "tip2", "tip3", "tip4", "tip5", "tip6"];
/** Rotating shinobi tips while the hand model downloads. */
function LoadingTip() {
  useLang();
  const [i, setI] = useState(() => Math.floor(Math.random() * TIPS.length));
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % TIPS.length), 3200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="loading-tip" key={i}>
      <b>忍</b> {t(TIPS[i])}
    </div>
  );
}
