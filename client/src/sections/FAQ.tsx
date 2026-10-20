import { ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

import "./FAQ.css";

const faqItems = [
  {
    question:
      "What courses and training does Learners Commercial Institute offer?",
    answer:
      "Learners Commercial Institute provides training in English and Malayalam typewriting, English and Malayalam shorthand, computer skills, office-oriented courses, and examination-focused preparation.",
  },
  {
    question: "Do you provide preparation for KGTE examinations?",
    answer:
      "Yes. Learners provides focused preparation for KGTE examinations, including relevant typewriting and shorthand training.",
  },
  {
    question: "Do you provide training for SSC and PSC examinations?",
    answer:
      "Yes. Training is available for candidates preparing for relevant SSC and PSC examinations, particularly in areas such as typewriting and shorthand.",
  },
  {
    question: "Can I learn both English and Malayalam typewriting?",
    answer:
      "Yes. Learners offers training in both English and Malayalam typewriting.",
  },
  {
    question: "Is shorthand training available?",
    answer: "Yes. Training is available in English and Malayalam shorthand.",
  },
  {
    question: "Does the institute also provide computer training?",
    answer:
      "Yes. Computer and office-oriented skill training is also available alongside typewriting and shorthand courses.",
  },
  {
    question: "How can I know the current batch timings and fees?",
    answer:
      "Batch availability, timings and fees may vary. You can submit an enquiry through the website or contact the institute for the latest information.",
  },
  {
    question: "Where is Learners Commercial Institute located?",
    answer:
      "Learners Commercial Institute is located in Thirunakkara, Kottayam, Kerala.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq">
      <div className="container">
        <div className="faq-section__layout">
          <div className="faq-section__intro">
            <div className="faq-section__eyebrow">
              <HelpCircle size={15} strokeWidth={2} aria-hidden="true" />
              Frequently Asked Questions
            </div>

            <h2>Questions about learning at Learners?</h2>

            <p>
              Find answers to common questions about courses, examination
              preparation and training at Learners Commercial Institute.
            </p>

            <a href="#enquiry" className="faq-section__contact">
              Still have a question?
              <span>Send an enquiry</span>
            </a>
          </div>

          <div className="faq-section__list">
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;

              const contentId = `faq-answer-${index}`;

              return (
                <article
                  key={item.question}
                  className={`faq-item ${isOpen ? "faq-item--open" : ""}`}
                >
                  <button
                    type="button"
                    className="faq-item__question"
                    onClick={() => toggleItem(index)}
                    aria-expanded={isOpen}
                    aria-controls={contentId}
                  >
                    <span>{item.question}</span>

                    <span className="faq-item__icon">
                      <ChevronDown
                        size={19}
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                    </span>
                  </button>

                  <div
                    id={contentId}
                    className="faq-item__answer"
                    hidden={!isOpen}
                  >
                    <p>{item.answer}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
