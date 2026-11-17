"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight, ArrowRight, AudioLines, BookOpen, Camera, Check,
  ChevronRight, Flame, Globe2, Hand, House, Languages, MessageSquareText,
  ScanLine, Sparkles, Target, Zap,
} from "lucide-react";
import { copy, languages, shortLanguages, type CopyKey, type Language } from "./copy";
import { letters, units } from "./course";
import { initialProgress, readProgress, recordActivity, streakFor, today, xpFor, type Progress } from "./progress";
import { Lessons } from "./Lessons";
import { CameraPractice } from "./CameraPractice";
import { Tutor, Translate } from "./Communication";

const navigation = [
  { id: "home", icon: House },
  { id: "learn", icon: BookOpen },
  { id: "practice", icon: ScanLine },
  { id: "translate", icon: Languages },
  { id: "tutor", icon: MessageSquareText },
] as const;

type Section = typeof navigation[number]["id"];
type Path = "beginner" | "adapting";

function currentSection(): Section {
  const hash = window.location.hash.slice(1);
  return navigation.find(({ id }) => id === hash)?.id ?? "home";
}

function saveValue(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* optional persistence */ }
}

export function Ishara() {
  const [locale, setLocale] = useState<Language>("ru");
  const [section, setSection] = useState<Section>("home");
  const [path, setPath] = useState<Path>("beginner");
  const [progress, setProgress] = useState(initialProgress);
  const [ready, setReady] = useState(false);
  const t = (key: CopyKey) => copy[key][locale];

  useEffect(() => {
    const update = () => {
      setSection(currentSection());
      window.scrollTo(0, 0);
    };
    update();
    window.addEventListener("hashchange", update);
    setProgress(readProgress());
    try {
      const storedLanguage = localStorage.getItem("ishara:language");
      if (storedLanguage === "ru" || storedLanguage === "kk" || storedLanguage === "en") setLocale(storedLanguage);
      if (localStorage.getItem("ishara:path") === "adapting") setPath("adapting");
    } catch { /* optional persistence */ }
    setReady(true);
    return () => window.removeEventListener("hashchange", update);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    document.title = `Ishara · ${copy.app[locale]}`;
    saveValue("ishara:language", locale);
  }, [locale, ready]);

  useEffect(() => {
    if (ready) saveValue("ishara:path", path);
  }, [path, ready]);

  useEffect(() => {
    if (ready) saveValue("ishara:progress", JSON.stringify(progress));
  }, [progress, ready]);

  function award(id: string) {
    setProgress((previous) => recordActivity(previous, id));
  }

  const xp = Object.keys(progress.earned).reduce((sum, id) => sum + xpFor(id), 0);
  const href = (id: Section) => `#${id}`;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(e) => {
        e.preventDefault();
        document.getElementById("main-content")?.focus();
      }}>{t("skip")}</a>
      <aside className="sidebar">
        <a className="wordmark" href="#home"><span className="brand-mark"><Hand size={22} /></span><strong>Ishara<span>.</span></strong></a>
        <nav aria-label={t("menu")}>
          {navigation.map(({ id, icon: Icon }) => (
            <a key={id} className={`nav-link ${section === id ? "nav-active" : ""}`} href={href(id)} aria-current={section === id ? "page" : undefined}>
              <Icon size={19} strokeWidth={1.8} /><span>{t(id)}</span>{section === id && <span className="nav-dot" aria-hidden />}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot"><Hand size={17} /><span>{t("app")}</span></div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <a className="wordmark mobile-brand" href="#home"><span className="brand-mark"><Hand size={19} /></span><strong>Ishara<span>.</span></strong></a>
          <span className="breadcrumb"><span>{t("app")}</span><ChevronRight size={15} /><strong>{t(section)}</strong></span>
          <div className="locale-switch" role="group" aria-label={t("language")}>
            <Globe2 size={16} aria-hidden />
            {(Object.keys(languages) as Language[]).map((lang) =>
              <button key={lang} type="button" title={languages[lang]} aria-label={languages[lang]} aria-pressed={locale === lang} onClick={() => setLocale(lang)}>{shortLanguages[lang]}</button>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className={`main-content ${section === "home" ? "is-home" : ""}`}>
          {section === "home" && <>
            <div className="home-grid">
              <div className="home-main">
                <section className="hero" aria-labelledby="hero-title">
                  <div className="hero-image" aria-hidden />
                  <div className="hero-content">
                    <div className="hero-overline"><span aria-hidden />{t("courseLabel")}</div>
                    <h1 id="hero-title">{t("heroFirst")}<br /><em>{t("heroSecond")}</em></h1>
                    <p>{t("heroBody")}</p>
                    <a className="button button-lime" href={path === "adapting" ? "#translate" : "#learn"}>
                      {path === "adapting" ? t("support") : t(xp ? "keepGoing" : "start")}<ArrowRight size={18} />
                    </a>
                  </div>
                  <span className="hero-caption" aria-hidden><ScanLine size={15} />{t("heroCV")}</span>
                </section>
                <section className="path-section" aria-labelledby="path-title">
                  <div className="section-heading"><h2 id="path-title">{t("path")}</h2><p>{t("pathDescription")}</p></div>
                  <div className="path-grid">
                    {([{ id: "beginner", icon: BookOpen }, { id: "adapting", icon: AudioLines }] as const).map(({ id, icon: Icon }) =>
                      <button key={id} type="button" className={`path-card ${path === id ? "path-active" : ""}`} aria-pressed={path === id} onClick={() => setPath(id)}>
                        <span className={`tile-icon ${id === "adapting" ? "violet" : ""}`}><Icon size={20} /></span>
                        <span><strong>{t(id)}</strong><small>{t(id === "beginner" ? "beginnerBody" : "adaptingBody")}</small></span>
                        <span className="path-check" aria-hidden>{path === id && <Check size={13} strokeWidth={3} />}</span>
                      </button>
                    )}
                  </div>
                </section>
              </div>
              <div className="home-aside">
                <ProgressCard t={t} xp={xp} progress={progress} />
                <a className="tutor-teaser" href="#tutor">
                  <span className="tile-icon violet"><Sparkles size={20} /></span><ArrowDownRight className="teaser-arrow" size={19} />
                  <strong>{t("tutor")}</strong><small>{t("tutorBody")}</small>
                </a>
              </div>
            </div>
            <section className="activity-section" aria-labelledby="activity-title">
              <div className="section-heading"><h2 id="activity-title">{t("lessonsTitle")}</h2></div>
              <div className="activity-grid">
                {([
                  ["learn", "alphabet", "alphabetBody", BookOpen, "mint"],
                  ["practice", "cameraTitle", "cameraBody", Camera, "violet"],
                  ["translate", "phrases", "phrasesBody", MessageSquareText, "peach"],
                ] as const).map(([id, title, desc, Icon, color]) =>
                  <a className="activity-card" href={href(id)} key={id}>
                    <span className={`tile-icon ${color}`}><Icon size={20} /></span>
                    <span><strong>{t(title)}</strong><small>{t(desc)}</small></span>
                    <ChevronRight className="activity-arrow" size={19} />
                  </a>
                )}
              </div>
            </section>
          </>}
          {section === "learn" && <Lessons locale={locale} t={t} progress={progress} path={path} award={award} />}
          {section === "practice" && <CameraPractice locale={locale} t={t} progress={progress} award={award} />}
          {section === "translate" && <Translate key={locale} locale={locale} t={t} prioritizeCards={path === "adapting"} />}
          {section === "tutor" && <Tutor locale={locale} t={t} />}
        </main>
        <footer className="workspace-footer"><span>{t("studio")}</span><span>{t("localProgress")}</span></footer>
      </div>
    </div>
  );
}

export type T = (key: CopyKey) => string;
export interface LearningProps {
  locale: Language;
  t: T;
  progress: Progress;
  award: (id: string) => void;
}

function ProgressCard({ t, xp, progress }: { t: T; xp: number; progress: Progress }) {
  const count = Math.min(2, progress.daily[today()]?.length ?? 0);
  return (
    <section className="progress-card" aria-labelledby="progress-title">
      <div className="progress-heading"><h2 id="progress-title">{t("progress")}</h2><span><Zap size={18} /></span></div>
      <div className="progress-metrics">
        <div><span className="metric-icon metric-xp"><Zap size={17} /></span><strong>{xp}</strong><small>{t("points")}</small></div>
        <div><span className="metric-icon metric-fire"><Flame size={17} /></span><strong>{streakFor(progress)}</strong><small>{t("streak")}</small></div>
      </div>
      <div className="daily">
        <div className="daily-title"><Target size={17} /><strong>{t("goal")}</strong><span>{count} / 2</span></div>
        <progress aria-label={t("goal")} value={count} max={2} />
        <small>{t(count === 2 ? "goalDone" : "goalBody")}</small>
      </div>
      <div className="lesson-progress" aria-label={t("alphabet")}>
        {units.map((unit) => <span key={unit.id} className={progress.earned[`lesson:${unit.id}`] ? "letter-earned" : ""}>{letters[unit.letters[0]]}</span>)}
      </div>
    </section>
  );
}
