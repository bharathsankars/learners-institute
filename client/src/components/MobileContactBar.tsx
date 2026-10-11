import {
  MessageCircle,
  MessageSquareText,
  Phone,
} from "lucide-react";
import { useEffect, useState } from "react";

import "./MobileContactBar.css";

export function MobileContactBar() {
  const [enquiryVisible, setEnquiryVisible] = useState(false);

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
        threshold: 0.12,
      },
    );

    observer.observe(enquiry);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <nav
      className={`mobile-contact-bar${
        enquiryVisible
          ? " mobile-contact-bar--hidden"
          : ""
      }`}
      aria-label="Quick contact"
    >
      <a
        href="tel:+919446125964"
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
        href="https://wa.me/919446125964"
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
    </nav>
  );
}
