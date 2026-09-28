/**
 * Hand sources: where landmarks come from.
 *
 *  - MediaPipeHandSource: the real thing. Webcam → MediaPipe HandLandmarker
 *    (WASM + GPU/CPU) running fully in the browser. No frames leave the device.
 *  - SyntheticHandSource (syntheticSource.ts): hidden developer input.
 *
 * Both push RawFrames into the same GestureRecognizer, so the game logic cannot
 * tell them apart.
 */
import type { RawFrame, RawHand, Vec3 } from "@/types/gestures";

export type CameraErrorKind = "denied" | "unavailable" | "insecure" | "model" | "unknown";

export class CameraError extends Error {
  constructor(
    public kind: CameraErrorKind,
    message: string,
  ) {
    super(message);
  }
}

export const CAMERA_ERROR_TEXT: Record<CameraErrorKind, string> = {
  denied: "Camera access is required to become a shinobi.",
  unavailable: "Camera not detected. Check your browser permissions.",
  insecure: "The camera only works over HTTPS (or on localhost).",
  model: "Could not load the hand-tracking model. Check your connection and try again.",
  unknown: "Something went wrong while starting the camera.",
};

export interface HandSource {
  readonly kind: "mediapipe" | "synthetic";
  /** Load models etc. */
  init(): Promise<void>;
  /** Ask for camera permission and attach the stream to `video`. */
  openCamera(video: HTMLVideoElement): Promise<void>;
  /** Start producing frames. */
  start(video: HTMLVideoElement, onFrame: (f: RawFrame) => void): void;
  stop(): void;
}

/** WASM runtime is copied from node_modules into /public by `npm install` (scripts/setup-mediapipe.mjs). */
const WASM_BASE = "/mediapipe/wasm";
/** Self-hosted model (downloaded on install), with Google's CDN as fallback. */
const MODEL_LOCAL = "/models/hand_landmarker.task";
const MODEL_REMOTE = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

type Landmarker = {
  detectForVideo(video: HTMLVideoElement, ts: number): {
    landmarks: Vec3[][];
    worldLandmarks: Vec3[][];
    handedness?: { score: number }[][];
    handednesses?: { score: number }[][];
  };
  close(): void;
};

async function pickModelUrl(): Promise<string> {
  try {
    const r = await fetch(MODEL_LOCAL, { method: "HEAD" });
    if (r.ok) return MODEL_LOCAL;
  } catch {
    /* fall through */
  }
  return MODEL_REMOTE;
}

export class MediaPipeHandSource implements HandSource {
  readonly kind = "mediapipe" as const;
  private landmarker: Landmarker | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private running = false;
  private lastVideoTime = -1;
  private lastTs = 0;

  async init() {
    if (this.landmarker) return;
    try {
      const { FilesetResolver, HandLandmarker } = await import("@mediapipe/tasks-vision");
      const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
      const modelAssetPath = await pickModelUrl();
      const create = (delegate: "GPU" | "CPU") =>
        HandLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath, delegate },
          runningMode: "VIDEO",
          numHands: 2,
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      let lm;
      try {
        lm = await create("GPU");
      } catch {
        lm = await create("CPU");
      }
      this.landmarker = lm as unknown as Landmarker;
    } catch (e) {
      console.error("[shinobi] model load failed", e);
      throw new CameraError("model", CAMERA_ERROR_TEXT.model);
    }
  }

  async openCamera(video: HTMLVideoElement) {
    if (typeof window !== "undefined" && !window.isSecureContext) throw new CameraError("insecure", CAMERA_ERROR_TEXT.insecure);
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraError("unavailable", CAMERA_ERROR_TEXT.unavailable);
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      });
    } catch (e) {
      const name = (e as DOMException)?.name;
      console.warn("[shinobi] getUserMedia failed", name);
      if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
        throw new CameraError("denied", CAMERA_ERROR_TEXT.denied);
      }
      if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError" || name === "DevicesNotFoundError") {
        throw new CameraError("unavailable", CAMERA_ERROR_TEXT.unavailable);
      }
      throw new CameraError("unknown", CAMERA_ERROR_TEXT.unknown);
    }
    video.srcObject = this.stream;
    video.muted = true;
    video.playsInline = true;
    await video.play().catch(() => undefined);
    if (video.readyState < 2) {
      await new Promise<void>((res) => video.addEventListener("loadeddata", () => res(), { once: true }));
    }
  }

  start(video: HTMLVideoElement, onFrame: (f: RawFrame) => void) {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const lm = this.landmarker;
      if (!lm || video.readyState < 2 || video.videoWidth === 0) return;
      // Only run inference on NEW video frames.
      if (video.currentTime === this.lastVideoTime) return;
      this.lastVideoTime = video.currentTime;
      let ts = performance.now();
      if (ts <= this.lastTs) ts = this.lastTs + 1; // MediaPipe requires strictly increasing timestamps
      this.lastTs = ts;

      const res = lm.detectForVideo(video, ts);
      const scores = res.handedness ?? res.handednesses ?? [];
      const hands: RawHand[] = (res.landmarks ?? []).map((l, i) => ({
        landmarks: l,
        world: res.worldLandmarks?.[i] ?? l,
        score: scores[i]?.[0]?.score ?? 0.9,
      }));
      onFrame({ hands, aspect: video.videoWidth / video.videoHeight, t: ts });
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }
}
