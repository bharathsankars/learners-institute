import { ArrowUpRight, MapPin, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { contact } from "../data/contact";

const quickLinks = [
  { label: "Courses", href: "#courses" },
  { label: "Our approach", href: "#about" },
  { label: "FAQs", href: "#faq" },
  { label: "Contact", href: "#contact" },
];

const mapsUrl = contact.mapsUrl;

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
              Practical learning for stronger skills, confidence and career
              preparation.
            </p>
          </div>

          <div className="site-footer__column">
            <span className="site-footer__label">Explore</span>

            <nav className="site-footer__links" aria-label="Footer navigation">
              {quickLinks.map((link) => (
                <a key={link.href} href={link.href}>
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="site-footer__column">
            <span className="site-footer__label">Contact</span>

            <div className="site-footer__contact-list">
              <a href={contact.phoneHref}>
                <Phone size={15} strokeWidth={1.8} aria-hidden="true" />

                <span>{contact.phoneDisplay}</span>
              </a>

              <a
                href={contact.whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={15} strokeWidth={1.8} aria-hidden="true" />

                <span>WhatsApp</span>
              </a>

              <a href="#enquiry">
                <ArrowUpRight size={15} strokeWidth={1.8} aria-hidden="true" />

                <span>Course enquiry</span>
              </a>
            </div>
          </div>

          <div className="site-footer__column">
            <span className="site-footer__label">Visit</span>

            <a
              className="site-footer__address"
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPin size={17} strokeWidth={1.8} aria-hidden="true" />

              <span>
                Thirunakkara
                <small>Kottayam, Kerala</small>
              </span>
            </a>

            <span className="site-footer__founder">SN Paniker · Founder</span>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>
            © {new Date().getFullYear()} Learners Commercial Institute
          </span>

          <span className="site-footer__bottom-location">
            Thirunakkara · Kottayam
          </span>

          <Link to="/admin/login">
            Staff login
            <ArrowUpRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
