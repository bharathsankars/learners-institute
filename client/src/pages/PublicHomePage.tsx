import { BackToTop } from "../components/BackToTop";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import "./PublicHomePage.css";

import { About } from "../sections/About";
import { Contact } from "../sections/Contact";
import { Courses } from "../sections/Courses";
import { Enquiry } from "../sections/Enquiry";
import { FAQ } from "../sections/FAQ";
import { Hero } from "../sections/Hero";
import { WhyLearners } from "../sections/WhyLearners";

export function PublicHomePage() {
  return (
    <div className="app landing-page">
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Header />

      <main id="main-content" tabIndex={-1}>
        <Hero />

        <Courses />

        <About />
        <WhyLearners />

        <FAQ />
        <Contact />

        <Enquiry />
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}
