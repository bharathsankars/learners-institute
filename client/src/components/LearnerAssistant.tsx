import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, MessageCircle, Send, X } from "lucide-react";
import { usePublicCourses } from "../hooks/usePublicCourses";
import { answerLearnerQuestion } from "../utils/learnerAssistant";
import "./LearnerAssistant.css";

type Message = { id: number; role: "assistant" | "visitor"; text: string };
const suggestions = ["Courses", "Admissions", "Fees & timings", "Location"];
export function LearnerAssistant() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ id: 0, role: "assistant", text: "Welcome to Learners. I’m the FAQ assistant. Ask about courses, admissions or how to reach us." }]);
  const messageId = useRef(1);
  const courses = usePublicCourses();
  const launcher = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }, [messages, open]);
  const close = () => { setOpen(false); launcher.current?.focus(); };
  const ask = (question: string) => {
    const text = question.trim();
    if (!text) return;
    const answer = answerLearnerQuestion(text, courses.isError ? undefined : courses.data);
    const visitorId = messageId.current++;
    const replyId = messageId.current++;
    setMessages(current => [...current.slice(-36), { id: visitorId, role: "visitor", text }, { id: replyId, role: "assistant", text: answer }]);
    setDraft("");
    input.current?.focus();
  };
  const submit = (event: FormEvent) => { event.preventDefault(); ask(draft); };
  return <div className="learner-assistant">
    {open && <section className="learner-assistant__panel" role="dialog" aria-labelledby="learner-assistant-title" id="learner-assistant-panel" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); close(); } }}>
      <header className="learner-assistant__header"><span><strong id="learner-assistant-title">Learners assistant</strong><small>Course & admissions FAQ</small></span><button type="button" onClick={close} aria-label="Close assistant"><X size={19} aria-hidden="true" /></button></header>
      <div ref={transcript} className="learner-assistant__messages" role="log" aria-live="polite" aria-relevant="additions" aria-label="Chat messages">{messages.map(message => <div key={message.id} className={`learner-assistant__message learner-assistant__message--${message.role}`}><span className="learner-assistant__speaker">{message.role === "visitor" ? "You" : "Learners assistant"}</span><p>{message.text}</p></div>)}</div>
      <div className="learner-assistant__suggestions" aria-label="Suggested questions">{suggestions.map(label => <button key={label} type="button" onClick={() => ask(label)}>{label}</button>)}</div>
      <nav className="learner-assistant__links" aria-label="Contact the institute"><a href="#enquiry" onClick={close}>Course enquiry<ArrowUpRight size={13} aria-hidden="true" /></a><a href="https://wa.me/919446125964" target="_blank" rel="noopener noreferrer">WhatsApp<ArrowUpRight size={13} aria-hidden="true" /></a><a href="#contact" onClick={close}>Directions</a></nav>
      <form onSubmit={submit} className="learner-assistant__form"><label htmlFor="learner-assistant-input" className="learner-assistant__sr-only">Ask a question</label><input ref={input} id="learner-assistant-input" value={draft} onChange={event => setDraft(event.target.value)} maxLength={300} placeholder="Ask about courses or admissions…" autoComplete="off" /><button type="submit" disabled={!draft.trim()} aria-label="Send question"><Send size={18} aria-hidden="true" /></button></form>
      <p className="learner-assistant__note">FAQ guidance · Confirm fees and availability with our team.</p>
    </section>}
    <button ref={launcher} className="learner-assistant__launcher" type="button" aria-expanded={open} aria-controls={open ? "learner-assistant-panel" : undefined} aria-label={open ? "Close Learners assistant" : "Open Learners assistant"} onClick={() => { if (open) close(); else setOpen(true); }}><MessageCircle size={23} aria-hidden="true" /><span>Ask Learners</span></button>
  </div>;
}
