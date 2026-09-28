/**
 * Runs after `npm install`:
 *  1. Copies the MediaPipe WASM runtime into /public so it is served from our own
 *     origin (version always matches the installed JS package).
 *  2. Downloads the hand landmarker model into /public/models (self-hosted, so the
 *     game still works on networks that block Google Storage). If the download
 *     fails, the app falls back to Google's CDN at runtime — never fatal.
 */
import { cpSync, existsSync, mkdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wasmSrc = join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const wasmDst = join(root, "public/mediapipe/wasm");
const modelDst = join(root, "public/models/hand_landmarker.task");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";

if (existsSync(wasmSrc)) {
  mkdirSync(wasmDst, { recursive: true });
  cpSync(wasmSrc, wasmDst, { recursive: true });
  console.log("[shinobi] MediaPipe WASM copied to public/mediapipe/wasm");
} else {
  console.warn("[shinobi] @mediapipe/tasks-vision not found — skipping WASM copy");
}

if (existsSync(modelDst) && statSync(modelDst).size > 1_000_000) {
  console.log("[shinobi] hand model already present");
} else {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(MODEL_URL, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    mkdirSync(dirname(modelDst), { recursive: true });
    writeFileSync(modelDst, buf);
    console.log(`[shinobi] hand model downloaded (${(buf.length / 1e6).toFixed(1)} MB)`);
  } catch (e) {
    console.warn(`[shinobi] could not download the hand model (${e.message}); the app will load it from Google's CDN at runtime.`);
  }
}
