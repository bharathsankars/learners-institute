import { BookOpenCheck, Keyboard, MapPin, MonitorCheck } from "lucide-react";
import "./About.css";

const features = [
  {
    icon: Keyboard,
    title: "Practice-oriented learning",
    description:
      "Training focuses on developing skills through regular hands-on practice.",
  },
  {
    icon: BookOpenCheck,
    title: "Career-relevant skills",
    description:
      "Courses focus on practical abilities useful for study, office work, and professional tasks.",
  },
  {
    icon: MonitorCheck,
    title: "Traditional & digital skills",
    description:
      "Learn established skills such as typewriting and shorthand alongside practical computer training.",
  },
  {
    icon: MapPin,
    title: "Located in Kottayam",
    description:
      "Learners Commercial Institute is located in Thirunakkara, Kottayam, Kerala.",
  },
];

export function About() {
  return (
    <section id="about" className="about-section section">
      <div className="container about-section__layout">
        <div className="about-section__content">
          <span className="about-section__eyebrow">About Learners</span>

          <h2 className="about-section__title">
            Good learning starts with regular practice.
          </h2>

          <p className="about-section__lead">
            Learners Commercial Institute provides practical training in
            typewriting, shorthand, computer skills, and office-oriented
            learning in Thirunakkara, Kottayam.
          </p>

          <p className="about-section__text">
            The focus is on structured practice and developing skills that
            learners can use confidently in academic, professional, and everyday
            office environments.
          </p>

          <a className="about-section__cta" href="#enquiry">
            Talk to us about a course
          </a>
        </div>

        <div className="about-section__features">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="about-feature" key={title}>
              <div className="about-feature__icon" aria-hidden="true">
                <Icon size={22} strokeWidth={1.8} />
              </div>

              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
