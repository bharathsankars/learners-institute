import {
  MessageCircle,
  MessageSquareText,
  Phone,
} from "lucide-react";
import { useEffect, useState } from "react";

import "./MobileContactBar.css";
import { contact } from "../data/contact";

type MobileContactBarProps = {
  assistantOpen: boolean;
  onAsk: () => void;
};

export function MobileContactBar({ assistantOpen, onAsk }: MobileContactBarProps) {
  const [enquiryVisible, setEnquiryVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const enquiry = document.getElementById("enquiry");

    if (!enquiry) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setEnquiryVisible(
          entry?.isIntersecting ?? false,
        );
      },
      {
        // Hide while the form crosses the middle of the screen. A ratio
        // threshold never triggers when the section is much taller than
        // the viewport (e.g. 400% zoom), leaving the bar over the fields.
        rootMargin: "-25% 0px -25% 0px",
        threshold: 0,
      },
    );

    observer.observe(enquiry);

    const footer = document.querySelector(".site-footer");

    if (footer) {
      const footerObserver = new IntersectionObserver(
        ([entry]) => {
          setFooterVisible(entry?.isIntersecting ?? false);
        },
        { threshold: 0 },
      );

      footerObserver.observe(footer);

      return () => {
        observer.disconnect();
        footerObserver.disconnect();
      };
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <nav
      className={`mobile-contact-bar${
        enquiryVisible || footerVisible
          ? " mobile-contact-bar--hidden"
          : ""
      }`}
      aria-label="Quick contact"
    >
      <a
        href={contact.phoneHref}
        className="mobile-contact-bar__action"
      >
        <Phone
          size={19}
          strokeWidth={1.9}
          aria-hidden="true"
        />

        <span>Call</span>
      </a>

      <a
        href={contact.whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mobile-contact-bar__action"
      >
        <MessageCircle
          size={19}
          strokeWidth={1.9}
          aria-hidden="true"
        />

        <span>WhatsApp</span>
      </a>

      <a
        href="#enquiry"
        className="
          mobile-contact-bar__action
          mobile-contact-bar__action--primary
        "
      >
        <MessageSquareText
          size={19}
          strokeWidth={1.9}
          aria-hidden="true"
        />

        <span>Enquire</span>
      </a>
      <button
        id="mobile-ask-learners"
        type="button"
        className="mobile-contact-bar__action"
        onClick={onAsk}
        aria-label="Ask Learners"
        aria-expanded={assistantOpen}
        aria-controls={assistantOpen ? "learner-assistant-panel" : undefined}
        aria-haspopup="dialog"
      >
        <MessageCircle size={19} strokeWidth={1.9} aria-hidden="true" />
        <span>Ask</span>
      </button>
    </nav>
  );
}
