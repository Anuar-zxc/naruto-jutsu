/**
 * GestureRecognizer — our own rule-based seal classifier.
 *
 * Pipeline per camera frame:
 *   detectHands()      raw MediaPipe output → RawFrame (done by the HandSource)
 *   extractFeatures()  landmarks → normalised finger extension / distance / angle
 *   classifyGesture()  score every seal definition against the features
 *   getConfidence()    confidence for one specific seal
 *   smoothPrediction() temporal filter: majority vote + minimum hold time + cooldown
 *   getCorrection()    (delegated to correctionEngine) why the pose is not the expected seal
 */
import type { Correction, FrameFeatures, RawFrame, RecognitionFrame, SignId, SignScore } from "@/types/gestures";
import { SIGN_LIST, SIGNS } from "./gestureDefinitions";
import { FeatureSmoother, extractFrame } from "./gestureFeatures";
import { getCorrection } from "./correctionEngine";
import { scoreSign } from "./gestureScoring";

export * from "./gestureScoring";

// ---------------------------------------------------------------------------
// Recognizer with temporal smoothing
// ---------------------------------------------------------------------------

export interface RecognizerOptions {
  /** How long a seal must be held (ms) before it is accepted. */
  holdMs: number;
  /** Majority-vote window (frames) used to ignore single-frame glitches. */
  voteWindow: number;
  /** Minimum time between two accepted seals. */
  cooldownMs: number;
  /** Best seal must beat the runner-up by this margin, otherwise UNKNOWN. */
  margin: number;
  /** EMA factor for feature smoothing. */
  alpha: number;
}

export const DEFAULT_RECOGNIZER_OPTIONS: RecognizerOptions = {
  holdMs: 260,
  voteWindow: 5,
  cooldownMs: 320,
  margin: 0.06,
  alpha: 0.5,
};

export class GestureRecognizer {
  readonly opts: RecognizerOptions;
  private smoother: FeatureSmoother;
  private votes: (SignId | null)[] = [];
  private candidate: SignId | null = null;
  private candidateSince = 0;
  private stable: SignId | null = null;
  private stableConf = 0;
  private lastAcceptAt = -Infinity;
  private lastT = 0;
  private fps = 0;
  private lastFeatures: FrameFeatures | null = null;

  constructor(opts: Partial<RecognizerOptions> = {}) {
    this.opts = { ...DEFAULT_RECOGNIZER_OPTIONS, ...opts };
    this.smoother = new FeatureSmoother(this.opts.alpha);
  }

  reset() {
    this.smoother.reset();
    this.votes = [];
    this.candidate = null;
    this.stable = null;
    this.stableConf = 0;
  }

  /** Normalise + smooth features for this frame. */
  extractFeatures(raw: RawFrame): FrameFeatures {
    return this.smoother.smooth(extractFrame(raw));
  }

  /** All seals scored, best first. */
  classifyGesture(f: FrameFeatures): SignScore[] {
    return SIGN_LIST.map((d) => scoreSign(d, f)).sort((a, b) => b.confidence - a.confidence);
  }

  getConfidence(sign: SignId, f: FrameFeatures): number {
    return scoreSign(SIGNS[sign], f).confidence;
  }

  getCorrection(expected: SignId, f: FrameFeatures | null = this.lastFeatures): Correction | null {
    if (!f) return null;
    return getCorrection(SIGNS[expected], f);
  }

  get features() {
    return this.lastFeatures;
  }

  /** Single-frame decision: best seal if above its threshold and clearly ahead of the runner-up. */
  pickRaw(scores: SignScore[]): { sign: SignId | null; confidence: number } {
    const [best, second] = scores;
    if (!best) return { sign: null, confidence: 0 };
    const def = SIGNS[best.sign];
    const clear = !second || best.confidence - second.confidence >= this.opts.margin;
    if (best.confidence >= def.threshold && clear) return { sign: best.sign, confidence: best.confidence };
    return { sign: null, confidence: best.confidence };
  }

  /**
   * Temporal filter. A seal is accepted only when the majority-voted label has
   * stayed the same for `holdMs`, e.g.
   *   TIGER TIGER TIGER TIGER … (≥260 ms) → ACCEPT
   *   TIGER SNAKE TIGER UNKNOWN          → no stable majority → not accepted
   */
  smoothPrediction(label: SignId | null, confidence: number, t: number) {
    this.votes.push(label);
    if (this.votes.length > this.opts.voteWindow) this.votes.shift();

    const counts = new Map<SignId | null, number>();
    for (const v of this.votes) counts.set(v, (counts.get(v) ?? 0) + 1);
    let voted: SignId | null = null;
    const need = Math.ceil(this.votes.length / 2 + 0.01);
    for (const [k, c] of counts) if (c >= need) voted = k;

    if (voted !== this.candidate) {
      this.candidate = voted;
      this.candidateSince = t;
    }

    let accepted: SignId | null = null;
    let hold: RecognitionFrame["hold"] = null;

    if (this.candidate) {
      const progress = Math.min(1, (t - this.candidateSince) / this.opts.holdMs);
      hold = { sign: this.candidate, progress };
      if (progress >= 1 && this.stable !== this.candidate) {
        if (t - this.lastAcceptAt >= this.opts.cooldownMs) {
          this.stable = this.candidate;
          this.stableConf = confidence;
          this.lastAcceptAt = t;
          accepted = this.candidate;
        }
      }
    } else if (this.stable && (counts.get(this.stable) ?? 0) === 0) {
      // Released: the previously stable seal has completely left the vote window.
      this.stable = null;
    }

    if (this.stable && this.stable === label) this.stableConf = 0.7 * this.stableConf + 0.3 * confidence;
    if (this.stable && this.candidate && this.candidate !== this.stable && hold && hold.progress >= 1) {
      // Candidate replaced the stable seal but is still in cooldown — drop the old one.
      this.stable = null;
    }

    return { stable: this.stable, stableConfidence: this.stable ? this.stableConf : 0, hold, accepted };
  }

  /** Full pipeline for one frame. */
  process(raw: RawFrame): RecognitionFrame {
    if (this.lastT) {
      const dt = raw.t - this.lastT;
      if (dt > 0) this.fps = this.fps ? 0.9 * this.fps + 0.1 * (1000 / dt) : 1000 / dt;
    }
    this.lastT = raw.t;

    const features = this.extractFeatures(raw);
    this.lastFeatures = features;
    const scores = this.classifyGesture(features);
    const rawPick = this.pickRaw(scores);
    const sm = this.smoothPrediction(rawPick.sign, rawPick.confidence, raw.t);
    return { features, scores, raw: rawPick, ...sm, fps: this.fps };
  }
}
