import {
  ArrowRight,
  MapPin,
  MessageSquareText,
  Phone,
  UserRound,
} from "lucide-react";

import "./Contact.css";

const mapsUrl = "https://www.google.com/maps?cid=9424450921971281392";

export function Contact() {
  return (
    <section id="contact" className="contact-section">
      <div className="container">
        <div className="contact-section__header">
          <div>
            <span className="contact-section__eyebrow">Contact Us</span>

            <h2>Have questions about a course or examination?</h2>
          </div>

          <p>
            Get in touch with Learners Commercial Institute for information
            about courses, examination preparation, admissions and current
            batches.
          </p>
        </div>

        <div className="contact-section__grid">
          {/* Location */}
          <article className="contact-card contact-card--primary">
            <div className="contact-card__icon">
              <MapPin size={22} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <span className="contact-card__label">Visit Learners</span>

            <h3>Learners Commercial Institute</h3>

            <p>
              Thirunakkara,
              <br />
              Kottayam, Kerala
            </p>

            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="contact-card__link">
              Open in Google Maps
              <ArrowRight size={16} aria-hidden="true" />
            </a>

            <div className="contact-card__location-note">
              <span />
              In-person training
            </div>
          </article>

          {/* Founder */}
          <article className="contact-card">
            <div className="contact-card__icon">
              <UserRound size={22} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <span className="contact-card__label">Founder</span>

            <h3>SN Paniker</h3>

            <p>
              Speak directly with the institute for information about courses,
              examination preparation, admissions and current batches.
            </p>

            <a href="tel:+919446125964" className="contact-card__link">
              <Phone size={15} strokeWidth={2} aria-hidden="true" />
              94461 25964
            </a>
          </article>

          {/* Enquiry */}
          <article className="contact-card">
            <div className="contact-card__icon">
              <MessageSquareText
                size={22}
                strokeWidth={1.8}
                aria-hidden="true"
              />
            </div>

            <span className="contact-card__label">Course Enquiries</span>

            <h3>Need more information?</h3>

            <p>
              Send an enquiry about course availability, examination
              preparation, fees or batch details.
            </p>

            <a href="#enquiry" className="contact-card__link">
              Send an Enquiry
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </a>
          </article>
        </div>

        <div className="contact-map">
          <div className="contact-map__header">
            <div className="contact-map__title-row">
              <div className="contact-map__pin" aria-hidden="true">
                <MapPin size={22} strokeWidth={1.8} />
              </div>

              <div>
                <span className="contact-map__eyebrow">Find us</span>

                <h3>Visit Learners in Kottayam</h3>

                <p>
                  Learners IT · Thirunakkara, Kottayam, Kerala
                </p>
              </div>
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="contact-map__directions"
            >
              Get directions
              <ArrowRight size={16} aria-hidden="true" />
            </a>
          </div>

          <div className="contact-map__frame">
            <iframe
              title="Learners IT location in Thirunakkara, Kottayam"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15736.186653857545!2d76.5003065871582!3d9.591246299999998!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b062bbe7ab70efb%3A0x82ca602e3f336df0!2sLearners%20IT!5e0!3m2!1sen!2sde!4v1792516570454!5m2!1sen!2sde"
              width="600"
              height="450"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />

            <div className="contact-map__location-chip">
              <MapPin size={18} strokeWidth={2} aria-hidden="true" />

              <span>
                <strong>Learners IT</strong>
                <small>Thirunakkara, Kottayam</small>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
