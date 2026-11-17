import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeftRight, ArrowRight, Copy, Expand, Languages, MessageSquareText, Send, Sparkles, X } from "lucide-react";
import { cards, languages, type Language } from "./copy";
import type { T } from "./Ishara";

type Props = { locale: Language; t: T };
type Message = { role: "user" | "assistant"; content: string };

async function ask(payload: object, signal: AbortSignal) {
  const result = await fetch("/api/tutor", {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), signal,
  });
  if (!result.ok) throw new Error(result.status === 429 ? "rateLimit" : "error");
  const { answer } = await result.json();
  if (typeof answer !== "string") throw new Error("error");
  return answer;
}

export function Translate({ locale, t, prioritizeCards }: Props & { prioritizeCards: boolean }) {
  const [from, setFrom] = useState<Language>(locale);
  const [to, setTo] = useState<Language>(locale === "kk" ? "ru" : "kk");
  const [cardLang, setCardLang] = useState<Language>(locale);
  const [text, setText] = useState("");
  const [output, setOutput] = useState("");
  const [show, setShow] = useState("");
  const [showLang, setShowLang] = useState<Language>(locale);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<AbortController | null>(null);

  useEffect(() => () => pending.current?.abort(), []);

  function large(value: string, lang: Language) {
    setShow(value);
    setShowLang(lang);
    dialog.current?.showModal();
  }

  function changeLanguage(which: "from" | "to", selected: Language) {
    if (which === "from") {
      if (selected === to) setTo(from);
      setFrom(selected);
    } else {
      if (selected === from) setFrom(to);
      setTo(selected);
    }
    setOutput("");
    setNotice("");
  }

  async function translate(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || pending.current) return;
    setNotice("");
    setOutput("");
    const known = cards.find((card) => card[from].toLowerCase() === text.trim().toLowerCase());
    if (known) {
      setOutput(known[to]);
      return;
    }
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    try {
      const answer = await ask({ mode: "translate", text: text.trim(), from, to }, controller.signal);
      setOutput(answer);
    } catch (error) {
      if (!controller.signal.aborted) setNotice(error instanceof Error && error.message === "rateLimit" ? t("rateLimit") : t("error"));
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setNotice(t("copied"));
    } catch {
      setNotice(t("copyError"));
    }
  }

  const cardsView = <section className="phrase-section">
    <div className="section-heading phrase-heading">
      <h2>{t("phrases")}</h2>
      <select aria-label={t("cardLanguage")} value={cardLang} onChange={(e) => setCardLang(e.target.value as Language)}>
        {(Object.keys(languages) as Language[]).map((lang) => <option value={lang} key={lang}>{languages[lang]}</option>)}
      </select>
    </div>
    <div className="phrase-grid">{cards.map((card) =>
      <button key={card.en} type="button" className="phrase-card" onClick={() => large(card[cardLang], cardLang)}>
        <MessageSquareText size={19} /><span lang={cardLang}>{card[cardLang]}</span><Expand size={17} />
      </button>)}</div>
  </section>;

  return (
    <section className="inner-page">
      <div className="page-heading"><span className="tile-icon peach"><Languages size={23} /></span><h1>{t("translate")}</h1><p>{t("translateBody")}</p></div>
      {prioritizeCards && cardsView}
      <form className="translate-card" onSubmit={translate}>
        <h2>{t("translateText")}</h2>
        <div className="translate-languages">
          <LanguageSelect label={t("from")} value={from} disabled={busy} onChange={(val) => changeLanguage("from", val)} />
          <button type="button" className="icon-button" disabled={busy} aria-label={t("swap")} title={t("swap")} onClick={() => {
            setFrom(to);
            setTo(from);
            if (output) {
              setText(output.slice(0, 600));
              setOutput(text);
            } else {
              setOutput("");
            }
            setNotice("");
          }}><ArrowLeftRight size={18} /></button>
          <LanguageSelect label={t("to")} value={to} disabled={busy} onChange={(val) => changeLanguage("to", val)} />
        </div>
        <div className="translate-fields">
          <div className="input-panel">
            <textarea value={text} maxLength={600} disabled={busy} lang={from} onChange={(e) => { setText(e.target.value); setOutput(""); setNotice(""); }} placeholder={t("input")} aria-label={t("input")} />
            <small>{text.length} / 600</small>
          </div>
          <div className="output-panel" aria-live="polite">
            {output ? <p lang={to}>{output}</p> : <p className="placeholder">{t(busy ? "busy" : "output")}</p>}
            {output && <div className="output-actions">
              <button type="button" className="icon-button" onClick={() => copyText(output)} aria-label={t("clipboard")} title={t("clipboard")}><Copy size={16} /></button>
              <button type="button" className="icon-button" onClick={() => large(output, to)} aria-label={t("show")} title={t("show")}><Expand size={16} /></button>
            </div>}
          </div>
        </div>
        <div className="form-action">
          <button className="button button-lime" type="submit" disabled={busy || !text.trim()}>{t(busy ? "busy" : "translateButton")}<ArrowRight size={17} /></button>
          <span role="status">{notice}</span>
        </div>
      </form>
      {!prioritizeCards && cardsView}
      <dialog ref={dialog} className="big-phrase" aria-label={t("show")}>
        <button type="button" className="icon-button" aria-label={t("close")} onClick={() => dialog.current?.close()}><X size={22} /></button>
        <p lang={showLang}>{show}</p>
      </dialog>
    </section>
  );
}

function LanguageSelect({ label, value, disabled, onChange }: {
  label: string; value: Language; disabled: boolean; onChange: (language: Language) => void;
}) {
  return <label><span>{label}</span><select aria-label={label} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value as Language)}>
    {(Object.keys(languages) as Language[]).map((lang) => <option value={lang} key={lang}>{languages[lang]}</option>)}
  </select></label>;
}

export function Tutor({ locale, t }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<"rateLimit" | "error" | null>(null);
  const pending = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, busy]);

  async function send(text: string) {
    if (!text.trim() || pending.current) return;
    const next: Message[] = [...messages, { role: "user", content: text.trim() }];
    setMessages(next);
    setDraft("");
    setError(null);
    setBusy(true);
    const controller = new AbortController();
    pending.current = controller;
    try {
      const answer = await ask({ mode: "tutor", history: next.slice(-9), language: locale }, controller.signal);
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessages(messages);
        setDraft(text);
        setError(error instanceof Error && error.message === "rateLimit" ? "rateLimit" : "error");
      }
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <section className="inner-page tutor-page">
      <div className="page-heading"><span className="tile-icon violet"><Sparkles size={22} /></span><h1>{t("tutor")}</h1><p>{t("tutorBody")}</p></div>
      <div className="chat-card">
        <div className="chat-log" ref={logRef} role="log" aria-label={t("tutor")}>
          <div className="chat-line"><span className="tile-icon violet"><Sparkles size={17} /></span><p>{t("chatWelcome")}</p></div>
          {messages.map((message, index) =>
            <div className={`chat-line ${message.role === "user" ? "chat-user" : ""}`} key={index}>
              {message.role === "assistant" && <span className="tile-icon violet"><Sparkles size={17} /></span>}<p>{message.content}</p>
            </div>
          )}
          {busy && <div className="chat-line"><span className="tile-icon violet"><Sparkles size={17} /></span><p>{t("busy")}</p></div>}
        </div>
        {messages.length === 0 && <div className="chat-suggestions">{(["chatPrompt1", "chatPrompt2", "chatPrompt3"] as const).map((prompt) =>
          <button key={prompt} type="button" onClick={() => send(t(prompt))}>{t(prompt)}<ArrowRight size={15} /></button>
        )}</div>}
        {error && <p className="chat-error" role="alert">{t(error)}</p>}
        <form className="chat-form" onSubmit={(e) => { e.preventDefault(); void send(draft); }}>
          <textarea aria-label={t("chatInput")} placeholder={t("chatInput")} maxLength={600} rows={2} value={draft} disabled={busy} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void send(draft); }
          }} />
          <button className="button button-lime" aria-label={t("send")} title={t("send")} type="submit" disabled={busy || !draft.trim()}><Send size={20} /></button>
        </form>
      </div>
    </section>
  );
}
