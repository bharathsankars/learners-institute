import { useState } from "react";
import { MessageCircle, Phone, Send } from "lucide-react";

import { BackToTop } from "../components/BackToTop";
import { Footer } from "../components/Footer";
import { Header } from "../components/Header";
import { LearnerAssistant } from "../components/LearnerAssistant";
import { MobileContactBar } from "../components/MobileContactBar";

import { useLandingAnimations } from "../hooks/useLandingAnimations";

import { About } from "../sections/About";
import { Contact } from "../sections/Contact";
import { Courses } from "../sections/Courses";
import { Enquiry } from "../sections/Enquiry";
import { FAQ } from "../sections/FAQ";
import { Hero } from "../sections/Hero";
import { Testimonials } from "../sections/Testimonials";
import { WhyLearners } from "../sections/WhyLearners";

import "./PublicHomePage.css";
import "./LandingMotion.css";
import "./BrandTheme.css";
import "./PublicMobile.css";
import "./BatchSectionFix.css";

type CourseSelectionIntent = {
  courseId: string;
  requestId: number;
};

export function PublicHomePage() {
  const [courseSelection, setCourseSelection] =
    useState<CourseSelectionIntent | null>(null);

  const handleCourseEnquiry = (courseId: string) => {
    setCourseSelection((current) => ({
      courseId,
      requestId: (current?.requestId ?? 0) + 1,
    }));
  };

  useLandingAnimations();

  return (
    <div className="app landing-page">
      <div className="scroll-progress" aria-hidden="true" />

      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Header />

      <main id="main-content" tabIndex={-1}>
        <Hero />

        <Courses onEnquire={handleCourseEnquiry} />

        <About />

        <WhyLearners />

        <section
          className="home-batches section"
          id="batch-timings"
          aria-labelledby="batch-timings-title"
        >
          <div className="container">
            <div className="home-batches__header">
              <span className="home-batches__eyebrow">Batch information</span>

              <h2 id="batch-timings-title">
                Choose a batch that fits your routine.
              </h2>

              <p>
                Batch schedules may vary by course. Contact Learners Commercial
                Institute to check current availability and find a suitable time
                for your training.
              </p>
            </div>

            <div className="home-batches__grid">
              <article className="home-batch">
                <div className="home-batch__content">
                  <span className="home-batch__label">Batch timings</span>

                  <h3>Ask for the latest schedule</h3>

                  <p>
                    Contact the institute to confirm the current timings
                    available for your preferred course.
                  </p>
                </div>

                <a className="home-batch__action" href="tel:+919446125964">
                  <span>Call the institute</span>

                  <Phone size={17} strokeWidth={2} aria-hidden="true" />
                </a>
              </article>

              <article className="home-batch">
                <div className="home-batch__content">
                  <span className="home-batch__label">Course availability</span>

                  <h3>Check current batches</h3>

                  <p>
                    Ask which courses and training options are currently
                    available for new enquiries.
                  </p>
                </div>

                <a className="home-batch__action" href="#enquiry">
                  <span>Send an enquiry</span>

                  <Send size={17} strokeWidth={2} aria-hidden="true" />
                </a>
              </article>

              <article className="home-batch">
                <div className="home-batch__content">
                  <span className="home-batch__label">Quick contact</span>

                  <h3>Chat on WhatsApp</h3>

                  <p>
                    Get in touch directly with Learners for course, batch and
                    admission information.
                  </p>
                </div>

                <a
                  className="
                    home-batch__action
                    home-batch__action--whatsapp
                  "
                  href="https://wa.me/919446125964"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span>Open WhatsApp</span>

                  <MessageCircle size={17} strokeWidth={2} aria-hidden="true" />
                </a>
              </article>
            </div>
          </div>
        </section>

        <Testimonials />

        <FAQ />

        <Contact />

        <Enquiry courseSelection={courseSelection} />
      </main>

      <Footer />

      <BackToTop />

      <MobileContactBar />

      <LearnerAssistant />
    </div>
  );
}
