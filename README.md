# Naruto Jutsu (SHINOBI — JUTSU)

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

## 24 seals: the 12 zodiac seals + 12 special seals

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
| Boar | 亥 | "tusks": index + pinky up · other hand a fist | HORNS + FIST |
| *Confrontation* | 対 | open palm · other hand index + middle | OPEN + PEACE |
| *Wind* | 風 | open palm · other hand index + pinky | OPEN + HORNS |
| *Spirit* | 霊 | index up · other hand index + pinky | INDEX + HORNS |
| *Fox* | 狐 | index + middle · other hand index + pinky | PEACE + HORNS |
| *Fire* | 火 | three fingers up · other hand a fist | THREE + FIST |
| *Water* | 水 | three fingers up · other palm open | THREE + OPEN |
| *Thunder* | 雷 | three fingers up · other hand index only | THREE + INDEX |
| *Earth* | 土 | two fists, one held **above** the other | FIST + FIST, stacked |
| *Moon* | 月 | three fingers · other hand index + middle | THREE + PEACE |
| *Star* | 星 | three fingers · other hand index + pinky | THREE + HORNS |
| *Mountain* | 山 | both hands three fingers up, together | THREE + THREE, together |
| *Shield* | 盾 | both palms open, one held **above** the other | OPEN + OPEN, stacked |

The twelve special seals (italic) aren't zodiac seals. Confrontation, Wind, Spirit and Fox power Rasengan, Kirin and Rasenshuriken; all 24 can be trained in the Dojo. "Three fingers" = index, middle and ring up, pinky folded. Snake now needs the fists side by side (stacked fists are Earth). A test checks that no two seals share the same rule set.

## Jutsu, effects and the three-jutsu loadout

At the start of every fight you pick **three jutsu**. There is no selection screen between rounds: the rounds rotate through your three (1 → 2 → 3 → 1…). During the countdown you can switch with keys 1–3 or a click. Once you've made the first seal, you're committed to that jutsu.

Every jutsu has an **effect** on top of its damage, so the choice of three matters:

| Jutsu | Seals | Element | Effect |
| --- | --- | --- | --- |
| Transformation (Henge) | Dog → Boar → Tiger | chakra | shield: blocks 1 enemy hit |
| Body Replacement (Kawarimi) | Tiger → Boar → Ox → Snake | chakra | shield: blocks 2 hits |
| Shadow Clone (Kage Bunshin) | Ram → Snake → Tiger | chakra | next jutsu ×1.8 damage |
| Great Fireball (Gōkakyū) | Snake → Ram → Monkey → Boar → Horse → Tiger | fire | burn: 70 per round for 3 rounds |
| Chidori | Ox → Rabbit → Monkey | lightning | pierce: ×1.9 if cast with no mistakes |
| Dragon Flame (Ryūka) | Snake → Dragon → Rabbit → Tiger | fire | burn: 90 per round for 2 rounds |
| Water Dragon (Suiryūdan), abridged | Ox → Monkey → Rabbit → Rat → Boar → Bird | water | heal: +30 chakra |
| Rasengan | Confrontation → Spirit → Fox | chakra | pure force: 330 damage for 3 seals |
| Phoenix Flower (Hōsenka) | Rat → Tiger → Dog → Ox → Rabbit → Tiger | fire | barrage: +22 damage per combo point |
| Summoning (Kuchiyose) | Boar → Dog → Bird → Monkey → Ram | chakra | summon: 90 per round for 3 rounds + blocks 1 hit |
| Kirin | Dragon → Wind → Spirit → Ox → Tiger | lightning | execute: ×2.2 if the enemy is below 40% |
| Rasenshuriken | Wind → Fox → Spirit → Confrontation → Wind | wind | 620 damage, but costs you 15 chakra |

Zodiac sequences come from fan seal guides for the series (sources vary on some). The Water Dragon is 44 seals long in the series, so the game uses its first six. Time limit: 3 s + 2.5 s per seal, plus the hero's perk.

### Harder fights: mistakes are expensive

- **Wrong seal:** −6…12 chakra (grows through the story), −1.5 s on the timer, combo reset.
- **Perfect jutsu** (no mistakes): the enemy is **staggered** and can't answer. Otherwise it **retaliates** at the end of the round (40% of its strike).
- **Time out:** the enemy strikes at full power (22 → 42 through the story). Shields absorb strikes.
- **Rage:** below 35% HP the enemy enrages: +35% damage, 15% less time for seals, a pulsing red screen.
- **0 chakra → DEFEAT** (rematch keeps your three jutsu).

## Modes, story and characters

- **Story:** 13 chapters in 4 arcs (The Genin's Path, Shadow of the Akatsuki, The Fourth War, The Next Generation) with 12 opponents: the mentor, Kisame, rival Sasuke, Hidan, Itachi, Konan, Pain, Obito, Obito (Ten-Tails), Madara, Momoshiki, Kawaki and Isshiki. Each chapter has a visual-novel scene before and after the fight, a VS splash, and a mid-fight exchange: the villain taunts you at half HP and your hero answers. New jutsu unlock as you progress; progress is saved in the browser.
- **23 battle backgrounds** (Chūnin Exam arena, Forest of Death, Hidden Rain and Sand villages, the war battlefield, Akatsuki hideout, Infinite Tsukuyomi and more), supplied by the project owner. Quick battle rotates through them.
- **Quick battle:** every jutsu unlocked, against a random villain. Takes about 2 minutes, which makes it the best mode for a demo.
- **Dojo (修行):** practise any of the 24 seals with no timer and no damage. Error Mode coaches you live; hold → release three times in a row to master a seal, then the dojo moves you to the next one. Mastery is saved in the browser.
- **Personal records:** the best score for quick battle and for each story chapter is saved. The result screen shows **NEW RECORD!** or your previous best.
- **24 playable characters**, each with a perk (extra time, or a damage bonus to an element or to everything). If you fight as a villain who is also the chapter boss, you face their "Shadow".
- **Russian / English:** the whole UI switches with the RU / EN toggle, including every Error Mode correction ("Выпрями средние пальцы на обеих руках."). The language is detected automatically and remembered.

## Music

Each scene has its own track: menu, dialogue, battle, boss (enemy below 35% HP) and victory. By default the game plays an **original score generated live in the browser**: Japanese *in*-scale melodies on a koto-like pluck, a breathy flute pad and taiko drums. To use your own licensed soundtrack, put `menu.mp3`, `dialogue.mp3`, `battle.mp3`, `boss.mp3` and `victory.mp3` into `public/assets/music/`. The game detects them and cross-fades between tracks, and any file that's missing falls back to the generated score. The ♪ button in the HUD toggles music, 🔊 / M mutes everything.

**Included audio (supplied by the project owner under the team's licence):** the soundtrack uses Naruto OST tracks for the menu (Toshiro Masuda), battle ("Fight"), boss (Madara's Perfect Susanoo theme) and victory ("Blue Bird"); dialogue keeps the generated score. Big moments use sound clips from `public/assets/sfx/` (charge, fire, Chidori, Rasengan, the enemy's strike, victory shout, defeat sting); see the README there. All audio is loudness-normalised, and any missing clip falls back to the synthesised sound.

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
npm test           # 52 tests: features, all 24 seals, smoothing, every correction path, loadout + effects, story + quick flow, defeat, dojo, AI sensei
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
