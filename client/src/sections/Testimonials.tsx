import { Quote } from "lucide-react";

import { reviews } from "../data/reviews";

import "./Testimonials.css";

// Only facts already stated on the site; add years or student counts once the institute confirms them.

const outcomes = [
  { value: "Practical", label: "Hands-on training" },
  { value: "Focused", label: "Exam preparation" },
  { value: "Confident", label: "Office-ready skills" },
  { value: "Career", label: "Stronger next step" },
];

export function Testimonials() {
  const hasSamples = reviews.some((review) => review.sample);

  return (
    <section id="testimonials" className="voices-section section">
      <div className="container">
        {reviews.length > 0 && (
          <>
            <div className="voices-section__header">
              <span className="voices-section__eyebrow">Student voices</span>

              <h2 className="voices-section__title">
                Progress you can <em>hear about.</em>
              </h2>

              {hasSamples && <br className="voices-section__divider" />}
            </div>

            <ul className="voices-section__stats" aria-label="Student outcomes">
              {outcomes.map((outcome) => (
                <li className="voices-stat" key={outcome.label}>
                  <strong>{outcome.value}</strong>
                  <span>{outcome.label}</span>
                </li>
              ))}
            </ul>

            <div className="voices-section__grid">
              {reviews.map(({ name, course, quote }) => (
                <figure className="voice-card" key={name}>
                  <Quote
                    className="voice-card__mark"
                    size={28}
                    strokeWidth={1.4}
                    aria-hidden="true"
                  />

                  <blockquote>
                    <p>{quote}</p>
                  </blockquote>

                  <figcaption>
                    <span className="voice-card__avatar" aria-hidden="true">
                      {name.charAt(0)}
                    </span>

                    <span>
                      <strong>{name}</strong>
                      <small>{course}</small>
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
