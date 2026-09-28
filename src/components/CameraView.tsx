"use client";

import type { RefObject } from "react";
import { useGame, useLive } from "@/hooks/useGame";
import type { TrackingStatus } from "@/hooks/useHandTracking";
import { CAMERA_ERROR_TEXT, type CameraErrorKind } from "@/lib/vision/handTracker";
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
      {synthetic && <div className="synthetic-tag">DEV · SYNTHETIC INPUT (keys 1–8)</div>}

      {status === "loading" && (
        <div className="camera-center">
          <div className="spinner" />
          <div className="camera-msg">Summoning the camera…</div>
          <div className="camera-sub">Allow camera access when your browser asks. Video never leaves your device.</div>
        </div>
      )}

      {status === "error" && error && (
        <div className="camera-center error">
          <div className="big-icon">⛩</div>
          <div className="camera-msg">{CAMERA_ERROR_TEXT[error]}</div>
          <div className="camera-sub">
            {error === "denied"
              ? "Click the camera icon in your browser's address bar, allow access, then try again."
              : "Close other apps using the camera, then try again."}
          </div>
          <button className="btn" onClick={retry}>
            TRY AGAIN
          </button>
        </div>
      )}

      {status === "running" && phase === "CAMERA_CHECK" && (
        <div className="calibration">
          <div className="calib-title">CAMERA CHECK</div>
          <div className="calib-hands">
            <span className={live.hands >= 1 ? "on" : ""}>✋</span>
            <span className={live.hands >= 2 ? "on" : ""}>✋</span>
          </div>
          <div className="calib-msg">{live.calibration > 0 ? "Hold still…" : "Place both hands inside the frame."}</div>
          <div className="calib-bar">
            <div className="calib-fill" style={{ width: `${live.calibration * 100}%` }} />
          </div>
        </div>
      )}

      {phase === "READY" && (
        <div className="stamp">
          <div className="stamp-kanji">忍</div>
          <div className="stamp-text">SHINOBI DETECTED</div>
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
