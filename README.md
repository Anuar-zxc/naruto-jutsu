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

## The 12 zodiac seals

Real seals interlock the fingers of both hands. A webcam tracker can't see fingers hidden behind the other hand, so each seal is a **camera-readable approximation**: one hand shape per hand, plus how the hands relate to each other (distance, height, direction). Where possible it keeps the look of the real seal. Every pair of seals differs in at least one clearly visible feature. The pictograms in the game are generated from the same definitions the classifier uses.

| Seal | Kanji | How to make it | Rules |
| --- | --- | --- | --- |
| Rat | 子 | index + middle up · other hand a fist, close | PEACE + FIST, together |
| Ox | 丑 | open palm and fist side by side | OPEN + FIST, same height |
| Tiger | 寅 | both hands index + middle up, together | PEACE + PEACE, together, up |
| Rabbit | 卯 | index up · other hand a fist | INDEX + FIST |
| Dragon | 辰 | both hands "horns" (index + pinky) | HORNS + HORNS |
| Snake | 巳 | two fists clasped close | FIST + FIST, together |
| Horse | 午 | both index fingers up, touching | INDEX + INDEX, together, up |
| Ram | 未 | index + middle · other hand index only | PEACE + INDEX |
| Monkey | 申 | both palms open, fingers up | OPEN + OPEN, up |
| Bird | 酉 | open palm · other hand index up | OPEN + INDEX |
| Dog | 戌 | open palm held **above** a fist | OPEN over FIST |
| Boar | 亥 | both palms open, fingers **down** | OPEN + OPEN, down |

## Jutsu — real seal sequences

The sequences come from fan seal guides for the series (sources vary on some of them). The Water Dragon is 44 seals long in the series, so the game uses its first six.

| Jutsu | Seals | Element |
| --- | --- | --- |
| Transformation (Henge) | Dog → Boar → Tiger | chakra |
| Body Replacement (Kawarimi) | Tiger → Boar → Ox → Snake | chakra |
| Shadow Clone (Kage Bunshin) | Ram → Snake → Tiger | chakra |
| Fire Style: Great Fireball (Gōkakyū) | Snake → Ram → Monkey → Boar → Horse → Tiger | fire |
| Chidori | Ox → Rabbit → Monkey | lightning |
| Fire Style: Dragon Flame (Ryūka) | Snake → Dragon → Rabbit → Tiger | fire |
| Water Style: Water Dragon (Suiryūdan), abridged | Ox → Monkey → Rabbit → Rat → Boar → Bird | water |
| Fire Style: Phoenix Flower (Hōsenka) | Rat → Tiger → Dog → Ox → Rabbit → Tiger | fire |
| Summoning (Kuchiyose) | Boar → Dog → Bird → Monkey → Ram | chakra |

Damage and time scale with the number of seals: 3 seals give 220 damage in 13 s, 6 seals give 460 damage in 22 s.

## Modes, story and characters

- **Story:** 12 chapters across 9 locations and 11 villains: Kisame, Hidan, Itachi, Konan, Pain, Obito, Obito (Ten-Tails), Madara, Madara (Six Paths), Kawaki and Isshiki. Chapter 1 is a sparring match with the mentor. Each chapter has visual-novel dialogue before and after the fight (typewriter text, active-speaker highlight; skip with Esc or the button). A villain taunts you when their HP drops below half. New jutsu unlock as you progress, and progress is saved in the browser.
- **Quick battle:** every jutsu unlocked, against a random villain. Takes about 2 minutes, which makes it the best mode for a demo.
- **24 playable characters**, each with a perk (extra time, or a damage bonus to an element or to everything). If you fight as a villain who is also the chapter boss, you face their "Shadow".
- **Russian / English:** the whole UI switches with the RU / EN toggle, including every Error Mode correction ("Выпрями средние пальцы на обеих руках."). The language is detected automatically and remembered.

## Error Mode

Error Mode is in `src/lib/vision/correctionEngine.ts`. It runs on every frame against the seal the player *should* be making.

**1. Measure.** For each finger we sum the bend angles at the MCP, PIP and DIP joints using MediaPipe's metric 3D *world* landmarks, then map the total to an extension score from 0 (curled) to 1 (straight). Angles don't depend on hand size, distance from the camera or in-plane rotation. Hand distance is measured in **palm lengths**, and orientation is the wrist → middle-knuckle angle.

**2. Detect the deviations.** Each rule produces zero or more issues with a severity:

| Rule | Detects | Example message |
| --- | --- | --- |
| stack | wrong height (Dog, Ox) | "Raise your open palm higher, above your fist." |
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
npm test           # 41 tests: features, all 12 seals, smoothing, every correction path, story + quick game flow
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
- ✅ **3+ gestures.** All 12 zodiac seals, each with its own in-game action, plus 9 jutsu with their real seal orders and four attack styles.
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
- To show off Error Mode, pick Chidori and make Snake (two fists) when the game asks for Rabbit. It will say "INCORRECT — THAT'S SNAKE · Raise your … index finger."
