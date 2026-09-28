# SHINOBI — JUTSU

> **Your hands are the controller.**

A browser game where you cast jutsu by performing ninja-style hand seals in front of your webcam. The camera tracks both hands in real time, our own classifier recognises each seal, and a boss takes damage when you finish a sequence. If a seal is wrong, the game tells you **exactly what to fix**: *"Extend your index fingers."*, *"Bring your hands closer together."*, *"Rotate your right hand inward."*

**Live demo:** https://shinobi-jutsu.vercel.app

---

## What is Shinobi?

1. Open the link and click **ENTER THE SHINOBI TRIAL**.
2. Allow the camera, then show both hands. The camera check confirms it can see them.
3. Choose your shinobi (10 characters, each with a perk). Your opponent is picked automatically.
4. Choose a jutsu (Fire, Water or Lightning). Each one is a sequence of 4–5 seals.
5. Perform the seals before the timer runs out. Every seal lights up as it's accepted.
6. Make a mistake and **Error Mode** names the problem and highlights the wrong finger in red on your skeleton.
7. Finish the sequence and the jutsu hits the enemy shinobi.
8. Defeat them and you get your score, accuracy, max combo, time and an **S / A / B / C** rank.

A full run takes about 1–2 minutes. Nothing is installed and nothing is uploaded: MediaPipe runs as WebAssembly inside the page, and video frames never leave the device.

## How it works

```
Camera (getUserMedia, mirrored)
  → MediaPipe HandLandmarker (WASM, GPU→CPU fallback, 2 hands, 21 landmarks each)
  → normalisation (joint angles on 3D world landmarks, distances in palm lengths)
  → custom rule-based seal classifier (8 seals, confidence per seal)
  → temporal smoothing (majority vote + 260 ms hold + cooldown)
  → correction engine (Error Mode)
  → game state machine → jutsu → boss damage → score / rank
```

The hot path runs **outside React**. Each camera frame goes tracker → recognizer → `GameSession` → canvas overlay. React only re-renders on game-state changes plus a live HUD capped at about 12 updates per second.

## Gestures

Every seal is a pair of hand shapes, plus in some cases a rule about how far apart the hands are or which way the fingers point. The pictograms in the game are generated from these same definitions, so the picture always matches what the classifier expects.

| Seal | Kanji | How to make it | Rule set | Used in |
| --- | --- | --- | --- | --- |
| Tiger | 寅 | Both hands: index + middle up, hands together | PEACE + PEACE, distance ≤ 2.6 palms, fingers up | Fire, Lightning |
| Ram | 未 | Both hands: only index fingers up | INDEX + INDEX, fingers up | Fire, Lightning |
| Snake | 巳 | Two fists close together | FIST + FIST, distance ≤ 2.6 | Fire, Lightning |
| Horse | 午 | Both palms open, side by side | OPEN + OPEN, distance ≤ 2.6 | Fire |
| Monkey | 申 | Both palms open, arms spread wide | OPEN + OPEN, distance ≥ 3.4 | Water |
| Dragon | 辰 | Both hands: index + pinky up ("horns") | HORNS + HORNS | Water, Lightning |
| Ox | 丑 | One open palm + one fist | OPEN + FIST (either hand) | Water |
| Bird | 酉 | One open palm + one index finger up | OPEN + INDEX (either hand) | Water, Lightning |

| Jutsu | Sequence | Damage | Time |
| --- | --- | --- | --- |
| 火遁 Fire Style: Ember Tiger Blast | Tiger → Ram → Snake → Horse | 300 | 16 s |
| 水遁 Water Style: Tidal Serpent | Ox → Monkey → Dragon → Bird | 350 | 18 s |
| 雷遁 Lightning Style: Thunder Fang | Ram → Dragon → Tiger → Snake → Bird | 450 | 20 s |

Each accepted seal triggers its own action (a sealed step, a kanji burst in the element's colour, points and combo), and each completed jutsu triggers a different attack (fire arc, water serpent, lightning bolt).

Sounds are synthesised with the Web Audio API, so the game ships no audio files.

## Characters & stages

| Shinobi | Perk |
| --- | --- |
| Naruto | +3 s on every jutsu |
| Sakura | +10% damage to all jutsu |
| Kakashi | +25% Lightning damage |
| Sasuke | +15% Lightning, +15% Fire |
| Itachi | +25% Fire damage |
| Minato | +4 s on every jutsu |
| Hashirama | +25% Water damage |
| Madara | +20% Fire, +2 s |
| Obito | +2 s, +10% all damage |
| Obito (Six Paths) | +20% all damage, −2 s |

The boss is chosen automatically from Madara → Obito (Six Paths) → Itachi → Obito, skipping the character you picked. The stages rotate each round: Hidden Leaf Village → Valley of the End → Ninja Academy. The artwork lives in `public/assets/`; it was cut out of its background and converted to WebP (about 1.1 MB in total).

## Credits & licence

Character and background artwork is used with permission from the rights holder, obtained by the project author. The permission covers this project only, and the artwork is **not** covered by the code licence. Keep a copy of the permission letter with the submission.

All code, the gesture-recognition system, the seal pictograms, effects and sounds are original to this project.

## Error Mode

Error Mode is in `src/lib/vision/correctionEngine.ts`. It runs on every frame against the seal the player *should* be making.

**1. Measure.** For each finger we sum the bend angles at the MCP, PIP and DIP joints using MediaPipe's metric 3D *world* landmarks, then map the total to an extension score from 0 (curled) to 1 (straight). Angles don't depend on hand size, distance from the camera or in-plane rotation. Hand distance is measured in **palm lengths**, and orientation is the wrist → middle-knuckle angle.

**2. Detect the deviations.** Each rule produces zero or more issues with a severity:

| Rule | Detects | Example message |
| --- | --- | --- |
| hands | hand missing / out of frame | "Show both hands — your left hand is out of view." |
| size | hands too small (too far from camera) | "Move closer to the camera." |
| shape | ≥ 3 wrong fingers on one hand | "Close both hands into fists." / "Open your right hand — spread all fingers." |
| fingers | a single finger in the wrong state | "Raise your right index finger." / "Fold down your middle fingers." |
| distance | hands too far apart / too close | "Bring your hands closer together." / "Spread your hands wider apart." |
| orientation | hand tilted or pointing down | "Rotate your right hand inward — fingers straight up." |

For asymmetric seals (Ox, Bird) the engine first finds which hand is closest to which role, so it never asks you to swap hands for no reason.

**3. Pick ONE message.** Rules are checked in priority order (hands → size → shape → fingers → distance → orientation), and within a rule the largest deviation wins. If both hands have the same finger wrong in the same direction, the two issues merge into one plural message ("Extend your index fingers").

**4. Keep it readable.** A `CorrectionStabilizer` only swaps messages after the new one has held for 6 frames, and keeps each message on screen for at least 0.9 s. The offending finger is drawn thick, red and pulsing on the skeleton.

**Hints and mistakes are different things:**
- **Hint** (amber, "ADJUST"): appears when you've been stuck on a step for more than 1.1 s. It doesn't cost points.
- **Mistake** (red, "⚠ INCORRECT — THAT'S SNAKE"): you *clearly* made a different seal (held for about 0.6 s). It counts against accuracy, breaks the combo and removes the PERFECT bonus. The correction shown is computed from the pose at that exact moment.

Transitional poses between seals never count as mistakes, and neither does still holding the previous seal.

## Architecture

```
src/
  app/                 Next.js App Router: layout (fonts, metadata), page, global CSS
  components/          React UI (no vision math here)
    ShinobiApp         root: start screen ↔ game
    GameScreen         layout + orchestration of effects (flash, shake, projectiles)
    CameraView         mirrored video, skeleton canvas, calibration, countdown
    GestureIndicator   "DETECTED: 巳 SNAKE 94%" + hands badge
    ErrorFeedback      Error Mode banner
    JutsuSequence      ✓ / → / ○ seal strip + timer
    CurrentSeal        big "make this seal now" card with pictogram
    CharacterSelect    roster with perks, automatic opponent
    Boss, HealthBar    enemy artwork on the stage background, HP bar with ghost damage
    JutsuSelect, ResultScreen (+ FailedPanel), GameHUD, StartScreen, DebugOverlay
  hooks/
    useHandTracking    camera + tracker lifecycle, per-frame pump (refs, no state)
    useGame            useSyncExternalStore bindings to GameSession
  lib/vision/
    handTracker        MediaPipe source, camera errors → friendly messages
    gestureFeatures    normalisation, finger extension, sides, smoothing
    gestureDefinitions the 8 seals: shapes, tolerance, threshold, correctionRules
    gestureScoring     per-finger / per-hand / per-seal scoring
    gestureRecognizer  GestureRecognizer: extractFeatures, classifyGesture,
                       getConfidence, getCorrection, smoothPrediction
    correctionEngine   Error Mode + CorrectionStabilizer
    overlayRenderer    skeleton drawing with error highlighting
    syntheticHand / syntheticSource   dev-only synthetic input (see below)
  lib/game/
    characters         roster, perks, boss order, stages
    gameState          pure reducer: IDLE → CAMERA_CHECK → READY → CHARACTER_SELECT → JUTSU_SELECTION →
                       COUNTDOWN → PLAYING → SUCCESS → JUTSU_CAST → NEXT_ROUND/VICTORY, FAILED
    session            GameSession: frame → game events, timers, sounds, live HUD store
    jutsu, scoring, combo
  lib/audio/sfx        Web Audio synthesised sound effects (mute: M)
  lib/fx/fxEngine      canvas particles, projectiles, shockwaves
  types/               gestures.ts, game.ts
tests/                 zero-dependency tests (vision + game + end-to-end session)
```

The game is one page driven by a state machine rather than separate routes, so the camera stream and the loaded model stay alive for the whole run.

## Run locally

Requirements: Node.js 18.18+ and a webcam.

```bash
npm install        # also copies the MediaPipe WASM into /public and downloads the hand model
npm run dev        # http://localhost:3000
```

Other commands:

```bash
npm test           # 34 tests: features, all 8 seals, smoothing, every correction path, game flow
npm run typecheck
npm run build && npm start
```

The camera needs a secure context: `localhost` works, and so does any HTTPS URL. To test on a phone over your LAN, use the deployed HTTPS URL or an HTTPS tunnel.

**Developer switches** (all off by default):
- `?debug=1` or press **D**: vision overlay with FPS, per-finger extension bars, hand distance and angles, and the top seal scores.
- **M** mutes and unmutes.
- `?synthetic=1`: synthetic hand input for development and CI with no camera. Keys 1–8 form seals, 0 = no hands, 9 = one hand, W = hands too wide, X = half-bent middle fingers. It is clearly labelled on screen, is never used in the real game, and feeds the *same* recognizer as the camera.

## Deployment

**Vercel (recommended):**
1. Push the repository to GitHub (public).
2. On vercel.com: **Add New → Project → Import** the repo. The framework is detected as Next.js, and no settings or environment variables are needed.
3. Deploy. `postinstall` copies the WASM runtime and downloads the model during the build.
4. Put the URL at the top of this README.

If the build machine can't reach Google Storage, the app loads the model from Google's CDN at runtime instead. To make the deployment fully self-contained, run `npm install` locally and commit `public/models/hand_landmarker.task` (about 7.5 MB).

## Hackathon compliance

- ✅ **Real-time webcam tracking.** MediaPipe HandLandmarker at camera frame rate (about 30 FPS on laptops), tracking two hands.
- ✅ **Browser-only.** No installs, plugins or backend. WASM + WebGL/CPU run inside the page.
- ✅ **3+ gestures.** 8 distinct seals, each with its own in-game action, plus 3 jutsu with different attacks.
- ✅ **Error Mode with concrete corrections.** Finger-, hand-, distance- and orientation-level instructions, one at a time, with the wrong finger highlighted on the skeleton.
- ✅ **Custom gesture logic.** MediaPipe only provides landmarks. Normalisation, classification, confidence, smoothing and corrections are all our own code (`src/lib/vision`). No pre-built gesture recogniser and no trained model.
- ✅ Visual recognition feedback: live skeleton, detected seal, confidence and hold progress.
- ✅ Complete loop with a final result: calibration → selection → countdown → seals → cast → boss HP → victory → rank.
- ✅ Score, combo (×2 / ×3), accuracy, speed bonus, PERFECT JUTSU and S/A/B/C rank.
- ✅ Sound (synthesised, with mute) and visual effects (particles, projectiles, screen shake, flashes).
- ✅ Responsive layout for laptop and phone (front camera).
- ✅ Friendly handling of camera denied, camera missing, no HTTPS, model load failure, hands out of view, one hand only, and hands too far away.

## Tips for a good demo

- Light your hands from the front and avoid a bright window behind you.
- Sit about 50–100 cm from a laptop webcam, with both hands and forearms in frame.
- Hold each seal for a moment. It's accepted after about a quarter of a second of stable detection.
- To show off Error Mode, make Snake (two fists) when the game asks for Ram. It will say "INCORRECT — THAT'S SNAKE · Extend your index fingers."
