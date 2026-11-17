import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Camera, Check, ExternalLink, MessageSquareText, Trophy } from "lucide-react";
import { cameraLetters, letters, photo, referenceSource, units, type Letter } from "./course";
import type { LearningProps } from "./Ishara";

type Unit = typeof units[number];

export function LessonPhoto({ letter, label, alternate = false }: { letter: Letter; label: string; alternate?: boolean }) {
  return <img className="lesson-photo" src={alternate ? `/ishara/${letter}-quiz.webp` : photo(letter)} alt={label} />;
}

export function Lessons({ locale, t, progress, path, award }: LearningProps & { path: "beginner" | "adapting" }) {
  const [unit, setUnit] = useState<Unit | null>(null);
  const [stage, setStage] = useState<"study" | "quiz" | "done">("study");
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<Letter | null>(null);
  const [quizChoices, setQuizChoices] = useState<Letter[][]>([]);
  const [reward, setReward] = useState(false);
  const id = unit ? `lesson:${unit.id}` : "";
  const question = unit?.letters[index];

  function startQuiz() {
    if (!unit) return;
    setIndex(0);
    setAnswer(null);
    setStage("quiz");
    setQuizChoices(unit.letters.map(() => {
      const options: Letter[] = [...unit.letters];
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }
      return options;
    }));
  }

  function next() {
    if (!unit || answer !== question) return;
    setAnswer(null);
    if (index < unit.letters.length - 1) {
      setIndex(index + 1);
      return;
    }
    setReward(!progress.earned[id]);
    award(id);
    setStage("done");
  }

  return (
    <section className="inner-page">
      {unit && <button className="back-link" type="button" onClick={() => { setUnit(null); setStage("study"); }}><ArrowLeft size={17} />{t("lessonsBack")}</button>}
      <div className="page-heading"><span className="tile-icon mint"><BookOpen size={22} /></span><h1>{unit?.name[locale] ?? t("alphabet")}</h1><p>{t("lessonIntro")}</p></div>
      {!unit && <>
        {path === "adapting" && <aside className="calm-card">
          <span className="tile-icon violet"><MessageSquareText size={22} /></span><div><h2>{t("calmTitle")}</h2><p>{t("calmBody")}</p></div><a className="button button-white" href="#translate">{t("support")}<ArrowRight size={16} /></a>
        </aside>}
        <div className="unit-grid">{units.map((item) =>
          <button type="button" className="unit-card" key={item.id} onClick={() => { setUnit(item); setStage("study"); }}>
            <div className="unit-art"><LessonPhoto letter={item.letters[0]} label="" /><div className="unit-letters">{item.letters.map((letter) => <span key={letter}>{letters[letter]}</span>)}</div></div>
            <div className="unit-name"><strong>{item.name[locale]}</strong>{progress.earned[`lesson:${item.id}`] ? <span role="img" aria-label={t("done")}><Check size={20} className="earned-check" /></span> : <ArrowRight size={19} />}</div>
          </button>
        )}</div>
      </>}
      {unit && stage === "study" && <>
        <div className="reference-grid">{unit.letters.map((letter) =>
          <article key={letter} className="reference-card">
            <LessonPhoto letter={letter} label={`${t("cameraReference")} ${letters[letter]}`} />
            <strong>{letters[letter]}</strong>
            {cameraLetters.some((id) => id === letter) && <a href={`/?letter=${letter}#practice`} className="reference-link"><Camera size={17} />{t("practice")}</a>}
          </article>)}</div>
        <button className="button button-lime" type="button" onClick={startQuiz}>{t("quiz")}<ArrowRight size={18} /></button>
      </>}
      {unit && question && stage === "quiz" && <div className="quiz-card" key={question}>
        <div className="quiz-count">{t("step")} {index + 1} / {unit.letters.length}</div>
        <progress value={index + 1} max={unit.letters.length} aria-label={t("step")} />
        <h2>{t("question")}</h2>
        <LessonPhoto letter={question} label={t("handshape")} alternate />
        <div className="quiz-choices">{quizChoices[index].map((option) =>
          <button key={option} type="button" className={answer === option ? (option === question ? "guess-correct" : "guess-wrong") : ""} aria-pressed={answer === option} disabled={answer === question && answer !== option} onClick={() => setAnswer(option)}>{letters[option]}</button>
        )}</div>
        <p role="status" className="quiz-feedback">{answer ? t(answer === question ? "correct" : "incorrect") : ""}</p>
        <button className="button button-lime" type="button" disabled={answer !== question} onClick={next}>{t(index === unit.letters.length - 1 ? "finish" : "next")}<ArrowRight size={18} /></button>
      </div>}
      {unit && stage === "done" && <div className="completion-card" role="status">
        <span className="tile-icon mint"><Trophy size={25} /></span><h2>{t(reward ? "done" : "repeated")}</h2>
        {reward && <p className="reward">+30 XP</p>}
        <div><button type="button" className="button button-white" onClick={() => { setUnit(null); setStage("study"); }}>{t("lessonsBack")}</button><a className="button button-lime" href="#practice">{t("cameraTitle")}<ArrowRight size={18} /></a></div>
      </div>}
      <a className="source-link" href={referenceSource} target="_blank" rel="noreferrer">{t("source")}<ExternalLink size={13} /></a>
    </section>
  );
}
