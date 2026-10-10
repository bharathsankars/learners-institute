import { GraduationCap, Laptop, Target, UsersRound } from "lucide-react";

import "./WhyLearners.css";

const reasons = [
  {
    icon: Target,
    title: "Focused learning",
    description:
      "Training is centred on practical skills and consistent improvement through regular practice.",
  },
  {
    icon: GraduationCap,
    title: "Structured guidance",
    description:
      "Learners are guided through fundamentals, practice, and progressive skill development.",
  },
  {
    icon: Laptop,
    title: "Relevant practical skills",
    description:
      "Courses combine traditional office skills with computer-based learning and documentation.",
  },
  {
    icon: UsersRound,
    title: "Supportive environment",
    description:
      "A learning environment designed to help students build confidence as they develop new skills.",
  },
];

export function WhyLearners() {
  return (
    <section id="why-learners" className="why-section section">
      <div className="container">
        <div className="why-section__header">
          <span className="why-section__eyebrow">Why Learners</span>

          <h2 className="why-section__title">
            A clear path from learning to doing.
          </h2>

          <p className="why-section__intro">
            Training is designed around practice, guidance, and skills that can
            be applied in academic, office, and professional environments.
          </p>
        </div>

        <div className="why-section__grid">
          {reasons.map(({ icon: Icon, title, description }, index) => (
            <article className="why-card" key={title}>
              <div className="why-card__top">
                <div className="why-card__icon" aria-hidden="true">
                  <Icon size={24} strokeWidth={1.8} />
                </div>

                <span className="why-card__number">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
