import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Check, ScanLine, ShieldCheck } from "lucide-react";
import { CameraError, MediaPipeHandSource } from "@/lib/vision/handTracker";
import { HAND_CONNECTIONS } from "@/lib/vision/gestureFeatures";
import type { RawFrame } from "@/types/gestures";
import { cameraHints, cameraLetters, letters, type CameraLetter } from "./course";
import { matchesHandshape } from "./match-handshape";
import type { LearningProps } from "./Ishara";
import { LessonPhoto } from "./Lessons";

function drawSkeleton(canvas: HTMLCanvasElement, video: HTMLVideoElement, data: RawFrame, matching: boolean) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const size = Math.max(width / video.videoWidth, height / video.videoHeight);
  const drawWidth = video.videoWidth * size;
  const drawHeight = video.videoHeight * size;
  if (!width || !height) return;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  const points = data.hands[0]?.landmarks.map(({ x, y }) => ({
    x: (width - drawWidth) / 2 + (1 - x) * drawWidth,
    y: (height - drawHeight) / 2 + y * drawHeight,
  }));
  if (!points) return;
  context.strokeStyle = matching ? "#d9f987" : "#fff";
  context.fillStyle = matching ? "#d9f987" : "#fff";
  context.lineWidth = 2;
  context.beginPath();
  for (const [a, b] of HAND_CONNECTIONS) {
    context.moveTo(points[a].x, points[a].y);
    context.lineTo(points[b].x, points[b].y);
  }
  context.stroke();
  for (const point of points) {
    context.beginPath();
    context.arc(point.x, point.y, 2.7, 0, 2 * Math.PI);
    context.fill();
  }
}

type State = "off" | "loading" | "live" | "denied" | "error";
type Feedback = "noHand" | "adjust" | "match" | "accepted";

export function CameraPractice({ locale, t, award, progress }: LearningProps) {
  const [target, setTarget] = useState<CameraLetter>("v");
  const [state, setState] = useState<State>("off");
  const [feedback, setFeedback] = useState<Feedback>("noHand");
  const [hold, setHold] = useState(0);
  const [earnedNow, setEarnedNow] = useState(false);
  const live = useRef<MediaPipeHandSource | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const active = useRef<CameraLetter>("v");
  const session = useRef({ letter: "v" as CameraLetter, since: 0, last: 0, complete: false, lastReport: 0 });
  const earned = useRef(progress.earned);

  useEffect(() => { earned.current = progress.earned; }, [progress.earned]);
  useEffect(() => {
    const initial = new URLSearchParams(location.search).get("letter");
    const letter = cameraLetters.find((id) => id === initial);
    if (letter) {
      active.current = letter;
      setTarget(letter);
    }
    return () => {
      live.current?.dispose();
      live.current = null;
    };
  }, []);

  function choose(letter: CameraLetter) {
    active.current = letter;
    setTarget(letter);
    session.current = { letter, since: 0, last: 0, complete: false, lastReport: 0 };
    setFeedback("noHand");
    setHold(0);
    setEarnedNow(false);
  }

  function stop() {
    live.current?.dispose();
    live.current = null;
    if (video.current) video.current.srcObject = null;
    setState("off");
    choose(active.current);
  }

  async function start() {
    if (!video.current || live.current) return;
    const element = video.current;
    const tracker = new MediaPipeHandSource();
    live.current = tracker;
    setState("loading");
    const fail = (error?: unknown) => {
      if (live.current !== tracker) return;
      tracker.dispose();
      element.srcObject = null;
      live.current = null;
      setState(error instanceof CameraError && error.kind === "denied" ? "denied" : "error");
    };

    try {
      await tracker.init();
      if (live.current !== tracker) return;
      await tracker.openCamera(element);
      if (live.current !== tracker) return;
      setState("live");
      tracker.start(element, (frame) => {
        if (!frame || live.current !== tracker) return;
        try {
          const current = session.current;
          const letter = active.current;
          const hand = frame.hands.length === 1 ? frame.hands[0] : null;
          const matches = !!hand && matchesHandshape(hand, frame.aspect, letter);
          if (canvas.current) drawSkeleton(canvas.current, element, frame, matches);
          if (current.complete) return;
          const time = frame.t;
          if (!matches || time - current.last > 230 || current.letter !== letter) current.since = 0;
          if (matches && current.since === 0) current.since = time;
          current.last = time;
          current.letter = letter;
          const portion = matches ? Math.min(1, (time - current.since) / 700) : 0;
          if (portion === 1) {
            current.complete = true;
            const id = `camera:${letter}`;
            setEarnedNow(!earned.current[id]);
            award(id);
            setFeedback("accepted");
            setHold(1);
          } else if (time - current.lastReport > 70) {
            current.lastReport = time;
            setFeedback(matches ? "match" : hand ? "adjust" : "noHand");
            setHold(portion);
          }
        } catch (error) {
          fail(error);
        }
      }, undefined, fail);
    } catch (error) {
      fail(error);
    }
  }

  return (
    <section className="inner-page">
      <div className="page-heading"><span className="tile-icon violet"><ScanLine size={22} /></span><h1>{t("cameraTitle")}</h1><p>{t("cameraIntro")}</p></div>
      <div className="practice-grid">
        <div className="practice-card">
          <div className="camera-stage" data-active={state === "live"}>
            <video ref={video} playsInline muted aria-hidden />
            <canvas ref={canvas} aria-hidden />
            <div className="camera-reticle" aria-hidden><i /><i /><i /><i /></div>
            {state !== "live" && <div className="camera-idle">
              <span className="tile-icon"><Camera size={25} /></span>
              <p role="status">{t(state === "loading" ? "loadingCamera" : state === "denied" ? "cameraDenied" : state === "error" ? "cameraUnavailable" : "cameraGuide")}</p>
              {state !== "loading" && <button className="button button-lime" type="button" onClick={start}>{t("startCamera")}<Camera size={17} /></button>}
              {state === "loading" && <button className="button button-dark" type="button" onClick={stop}>{t("close")}</button>}
            </div>}
          </div>
          {state === "live" && <div className="camera-feedback">
            <div role="status"><strong>{feedback === "accepted" && <Check size={19} />}{t(feedback)}</strong>{feedback === "accepted" && earnedNow && <span>+15 XP</span>}</div>
            <progress value={hold} max={1} aria-label={t("match")} />
          </div>}
          <div className="camera-meta"><span><ShieldCheck size={17} />{t("privacy")}</span>{state === "live" && <button type="button" className="text-button" onClick={stop}><CameraOff size={17} />{t("stopCamera")}</button>}</div>
        </div>
        <div className="camera-reference">
          <h2>{t("cameraReference")}</h2>
          <div className="letter-picker">{cameraLetters.map((letter) => <button key={letter} type="button" aria-pressed={letter === target} onClick={() => choose(letter)}>{letters[letter]}</button>)}</div>
          <LessonPhoto letter={target} label={`${t("cameraReference")} ${letters[target]}`} />
          <p>{cameraHints[target][locale]}</p>
        </div>
      </div>
      <a className="back-link" href="#learn">{t("alphabet")}</a>
    </section>
  );
}
