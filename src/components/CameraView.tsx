"use client";

import type { RefObject } from "react";
import { useGame, useLive } from "@/hooks/useGame";
import type { TrackingStatus } from "@/hooks/useHandTracking";
import type { CameraErrorKind } from "@/lib/vision/handTracker";
import { t } from "@/lib/i18n";
import { useLang } from "@/hooks/useLang";
import { GestureIndicator, HandsBadge } from "./GestureIndicator";
import { ErrorFeedback } from "./ErrorFeedback";

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
          <div className="spinner" />
          <div className="camera-msg">{t("loading")}</div>
          <div className="camera-sub">{t("loadingSub")}</div>
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
          {game.countdown}
        </div>
      )}
    </div>
  );
}
