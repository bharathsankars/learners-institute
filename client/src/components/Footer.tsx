import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

const quickLinks = [
  { label: "Courses", href: "#courses" },
  { label: "Our approach", href: "#about" },
  { label: "FAQs", href: "#faq" },
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__main">
          <div className="site-footer__brand-block">
            <a
              href="#home"
              className="site-footer__brand site-footer__brand--logo"
              aria-label="Learners Commercial Institute home"
            >
              <img
                src="/learners-logo-full.png"
                alt="Learners Commercial Institute"
              />
            </a>

            <p className="site-footer__tagline">
              Practical learning. Purposeful preparation.
            </p>

            <p className="site-footer__location">
              Thirunakkara, Kottayam, Kerala.
            </p>
          </div>

          <div className="site-footer__links">
            <span className="site-footer__label">Explore</span>

            {quickLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </div>

          <div className="site-footer__links">
            <span className="site-footer__label">Let’s talk</span>

            <a
              href="tel:+919446125964"
              aria-label="Call Learners Commercial Institute"
            >
              +91 94461 25964
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>

            <a href="#enquiry">
              Course enquiries
              <ArrowUpRight size={16} aria-hidden="true" />
            </a>

            <span className="site-footer__founder">SN Paniker · Founder</span>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} Learners Commercial Institute</span>

          <Link to="/admin/login">
            Staff login
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
