import { ArrowRight, ArrowUpRight, Keyboard, Laptop2, MapPin, NotebookPen } from "lucide-react";
import "./Hero.css";

const pathways = [
  { number: "01", title: "Typewriting", detail: "English & Malayalam", icon: Keyboard },
  { number: "02", title: "Shorthand", detail: "Dictation & transcription", icon: NotebookPen },
  { number: "03", title: "Computer skills", detail: "Practical office training", icon: Laptop2 },
];

export function Hero() {
  return <section id="home" className="hero-section">
    <div className="container hero-section__inner">
      <div className="hero-section__content">
        <div className="hero-section__eyebrow"><span />Skills for your next step</div>
        <h1 className="hero-section__title">A stronger foundation.<br /><span>A more confident future.</span></h1>
        <p className="hero-section__description">Build practical skills in typewriting, shorthand and computers, with focused preparation for KGTE, SSC and PSC examinations.</p>
        <div className="hero-section__actions">
          <a className="hero-section__primary" href="#courses">Find your course<ArrowRight size={18} aria-hidden="true" /></a>
          <a className="hero-section__secondary" href="tel:+919446125964">Speak to the institute<ArrowUpRight size={17} aria-hidden="true" /></a>
        </div>
        <div className="hero-section__meta"><MapPin size={16} aria-hidden="true" /><span>Thirunakkara, Kottayam · In-person learning</span></div>
      </div>
      <aside className="learning-guide" aria-label="Training at Learners">
        <div className="learning-guide__top"><span>LEARNERS / KOTTAYAM</span></div>
        <p className="learning-guide__label">Practice with purpose</p>
        <h2>Skills you can<br /><em>put to work.</em></h2>
        <div className="learning-guide__pathways">{pathways.map(({ number, title, detail, icon: Icon }) => <a href="#courses" key={number}><span className="learning-guide__number">{number}</span><div><strong>{title}</strong><span>{detail}</span></div><Icon size={22} strokeWidth={1.5} aria-hidden="true" /></a>)}</div>
        <div className="learning-guide__bottom"><span>EXAMINATION PREPARATION</span><strong>KGTE <span> / </span> SSC <span> / </span> PSC</strong></div>
      </aside>
    </div>
    <div className="container hero-foundations"><span>Built around your learning</span><p>Structured guidance</p><p>Regular practice</p><p>Practical application</p></div>
  </section>;
}
