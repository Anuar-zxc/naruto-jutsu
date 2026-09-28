"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { GameSession } from "@/lib/game/session";
import { GestureRecognizer } from "@/lib/vision/gestureRecognizer";
import { CameraError, MediaPipeHandSource, type CameraErrorKind, type HandSource } from "@/lib/vision/handTracker";
import { SyntheticHandSource } from "@/lib/vision/syntheticSource";
import { drawOverlay } from "@/lib/vision/overlayRenderer";
import type { RecognitionFrame } from "@/types/gestures";

export type TrackingStatus = "idle" | "loading" | "running" | "error";

interface Options {
  session: GameSession;
  active: boolean;
  synthetic: boolean;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

/**
 * Starts the camera + hand tracker and pumps every frame through
 * recognizer → session → overlay. Nothing in the hot path touches React state;
 * the only React updates here are status changes.
 */
export function useHandTracking({ session, active, synthetic, videoRef, canvasRef }: Options) {
  const [status, setStatus] = useState<TrackingStatus>("idle");
  const [error, setError] = useState<CameraErrorKind | null>(null);
  const [attempt, setAttempt] = useState(0);
  const lastFrame = useRef<RecognitionFrame | null>(null);
  const recognizer = useRef<GestureRecognizer | null>(null);

  useEffect(() => {
    if (!active) return;
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    const source: HandSource = synthetic ? new SyntheticHandSource() : new MediaPipeHandSource();
    const rec = new GestureRecognizer();
    recognizer.current = rec;
    session.attachRecognizer(rec);
    setStatus("loading");
    setError(null);

    (async () => {
      try {
        await Promise.all([source.init(), source.openCamera(video)]);
        if (cancelled) return;
        setStatus("running");
        source.start(video, (raw) => {
          const frame = rec.process(raw);
          lastFrame.current = frame;
          session.onFrame(frame);
          const canvas = canvasRef.current;
          if (canvas) {
            const st = session.getState();
            const expected = session.getLive().expected;
            const holdOnExpected = st.phase === "PLAYING" && frame.hold && frame.hold.sign === expected;
            drawOverlay(canvas, synthetic ? null : video, frame.features, session.overlay, {
              hold: holdOnExpected ? frame.hold!.progress : 0,
              holdTone: "good",
            });
          }
        });
      } catch (e) {
        if (cancelled) return;
        source.stop();
        setStatus("error");
        setError(e instanceof CameraError ? e.kind : "unknown");
      }
    })();

    return () => {
      cancelled = true;
      source.stop();
    };
  }, [active, synthetic, session, videoRef, canvasRef, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { status, error, retry, lastFrame, recognizer };
}
