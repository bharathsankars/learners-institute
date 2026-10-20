import { useState } from "react";
import { LearnerAssistant } from "../components/LearnerAssistant";
import { BackToTop } from "../components/BackToTop";
import { Header } from "../components/Header";
import { MobileContactBar } from "../components/MobileContactBar";
import { Footer } from "../components/Footer";
import "./PublicHomePage.css";
import "./LandingMotion.css";
import { useLandingAnimations } from "../hooks/useLandingAnimations";

import { About } from "../sections/About";
import { Contact } from "../sections/Contact";
import { Courses } from "../sections/Courses";
import { Enquiry } from "../sections/Enquiry";
import { FAQ } from "../sections/FAQ";
import { Hero } from "../sections/Hero";
import { Testimonials } from "../sections/Testimonials";
import { WhyLearners } from "../sections/WhyLearners";

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
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />

      <main id="main-content" tabIndex={-1}>
        <Hero />

        <Courses onEnquire={handleCourseEnquiry} />

        <About />
        <WhyLearners />
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
