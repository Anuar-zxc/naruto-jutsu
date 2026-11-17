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
  /**
   * Start producing frames. When `detect()` returns false the model is skipped and
   * `onFrame(null)` is called instead (video only) — used to save CPU/GPU in menus.
   */
  start(video: HTMLVideoElement, onFrame: (f: RawFrame | null) => void, detect?: () => boolean): void;
  stop(): void;
}

/** WASM runtime is copied from node_modules into /public by `npm install` (scripts/setup-mediapipe.mjs). */
const WASM_BASE = "/mediapipe/wasm";
/** Self-hosted model (downloaded on install), with Google's CDN as fallback. */
const MODEL_LOCAL = "/models/hand_landmarker.task";
const MODEL_REMOTE = "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
// Match the MediaPipe package pinned in package.json and the task already checked into the repo.
const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_CDN = "https://cdn.jsdelivr.net/gh/Anuar-zxc/naruto-jutsu@bac50b05e86962865d875a382ca2dec1dd9575d3/public/models/hand_landmarker.task";

type Landmarker = {
  detectForVideo(video: HTMLVideoElement, ts: number): {
    landmarks: Vec3[][];
    worldLandmarks: Vec3[][];
    handedness?: { score: number }[][];
    handednesses?: { score: number }[][];
  };
  close(): void;
};

async function getAsset(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(75_000)]) });
  if (!response.ok) throw new Error(`Could not load hand-tracking asset (HTTP ${response.status})`);
  return response;
}

async function downloadAsset<T>(local: string, mirror: string, signal: AbortSignal, read: (response: Response) => Promise<T>) {
  if (process.env.NODE_ENV === "production" && window.location.hostname.endsWith(".vercel.app")) {
    try {
      const mirrorSignal = AbortSignal.any([signal, AbortSignal.timeout(30_000)]);
      return await read(await getAsset(mirror, mirrorSignal));
    } catch (error) {
      if (signal.aborted) throw error;
    }
  }
  return await read(await getAsset(local, signal));
}

async function loadModel(signal: AbortSignal) {
  const read = async (response: Response) => new Uint8Array(await response.arrayBuffer());
  try {
    return await downloadAsset(MODEL_LOCAL, MODEL_CDN, signal, read);
  } catch (error) {
    if (signal.aborted) throw error;
    return await read(await getAsset(MODEL_REMOTE, signal));
  }
}

export class MediaPipeHandSource implements HandSource {
  readonly kind = "mediapipe" as const;
  private landmarker: Landmarker | null = null;
  private stream: MediaStream | null = null;
  private raf = 0;
  private running = false;
  private lastVideoTime = -1;
  private lastTs = 0;
  private cameraRequest = 0;
  private disposed = false;
  private readonly loading = new AbortController();

  async init() {
    if (this.landmarker || this.disposed) return;
    const signal = this.loading.signal;
    let wasmUrl: string | undefined;
    try {
      const wasmRuntime = import("@mediapipe/tasks-vision").then(async ({ FilesetResolver, HandLandmarker }) => {
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        const cdnUrl = `${WASM_CDN}/${fileset.wasmBinaryPath.split("/").at(-1)}`;
        const wasm = await downloadAsset(fileset.wasmBinaryPath, cdnUrl, signal, (response) => response.blob());
        return { fileset, HandLandmarker, wasm };
      });
      const [modelAssetBuffer, { fileset, HandLandmarker, wasm }] = await Promise.all([loadModel(signal), wasmRuntime]);
      wasmUrl = URL.createObjectURL(wasm);
      const runtime = { ...fileset, wasmBinaryPath: wasmUrl };
      const create = (delegate: "GPU" | "CPU") =>
        HandLandmarker.createFromOptions(runtime, {
          baseOptions: { modelAssetBuffer, delegate },
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
      if (this.disposed) lm.close();
      else this.landmarker = lm as unknown as Landmarker;
    } catch (e) {
      if (signal.aborted) return;
      console.error("[shinobi] model load failed", e);
      throw new CameraError("model", CAMERA_ERROR_TEXT.model);
    } finally {
      if (wasmUrl) URL.revokeObjectURL(wasmUrl);
    }
  }

  async openCamera(video: HTMLVideoElement) {
    if (typeof window !== "undefined" && !window.isSecureContext) throw new CameraError("insecure", CAMERA_ERROR_TEXT.insecure);
    if (!navigator.mediaDevices?.getUserMedia) throw new CameraError("unavailable", CAMERA_ERROR_TEXT.unavailable);
    const request = ++this.cameraRequest;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        // 960×540 is plenty for the hand model (it works on ~224 px crops) and halves the
        // per-frame upload / draw cost compared with 720p.
        video: { facingMode: "user", width: { ideal: 960 }, height: { ideal: 540 }, frameRate: { ideal: 30 } },
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
    if (this.disposed || this.cameraRequest !== request) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    this.stream = stream;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;
    await video.play();
  }

  start(video: HTMLVideoElement, onFrame: (f: RawFrame | null) => void, detect: () => boolean = () => true, onError?: (error: unknown) => void) {
    this.running = true;
    this.lastVideoTime = -1;
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const lm = this.landmarker;
      if (!lm || video.readyState < 2 || video.videoWidth === 0) return;
      // Only run inference on NEW video frames.
      if (video.currentTime === this.lastVideoTime) return;
      this.lastVideoTime = video.currentTime;
      if (!detect()) return onFrame(null);
      let ts = performance.now();
      if (ts <= this.lastTs) ts = this.lastTs + 1; // MediaPipe requires strictly increasing timestamps
      this.lastTs = ts;

      let res: ReturnType<Landmarker["detectForVideo"]>;
      try {
        res = lm.detectForVideo(video, ts);
      } catch (error) {
        this.stop();
        if (onError) onError(error);
        else console.error("Hand tracking failed", error);
        return;
      }
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
    this.cameraRequest++;
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  dispose() {
    this.disposed = true;
    this.loading.abort();
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }
}
