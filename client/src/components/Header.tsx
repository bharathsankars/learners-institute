import { ArrowUpRight, Menu, UserRound, X } from "lucide-react";
import { useEffect, useState } from "react";


import "./Header.css";

const navItems = [
  {
    label: "Courses",
    href: "#courses",
    key: "courses",
    sectionIds: ["courses"],
  },
  {
    label: "Our approach",
    href: "#about",
    key: "about",
    sectionIds: ["about", "why-learners"],
  },
  {
    label: "FAQs",
    href: "#faq",
    key: "faq",
    sectionIds: ["faq"],
  },
  {
    label: "Contact",
    href: "#contact",
    key: "contact",
    sectionIds: ["contact"],
  },
] as const;

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    const sections = navItems.flatMap((item) =>
      item.sectionIds.map((sectionId) => ({
        navKey: item.key,
        element: document.getElementById(sectionId),
      })),
    );

    let frameId: number | null = null;

    const updateActiveSection = () => {
      frameId = null;

      const activationPoint = Math.max(120, window.innerHeight * 0.32);

      let currentKey: string | null = null;

      for (const section of sections) {
        if (!section.element) continue;

        const rect = section.element.getBoundingClientRect();

        /*
         * Keep the latest section whose
         * beginning has crossed our
         * activation point.
         */
        if (rect.top <= activationPoint) {
          currentKey = section.navKey;
        }
      }

      /*
       * At the very bottom of the page,
       * explicitly keep the last available
       * navigation section active.
       */
      const reachedBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;

      if (reachedBottom) {
        for (let index = sections.length - 1; index >= 0; index -= 1) {
          if (sections[index].element) {
            currentKey = sections[index].navKey;

            break;
          }
        }
      }

      setActiveSection(currentKey);
    };

    const handleScroll = () => {
      if (frameId !== null) return;

      frameId = window.requestAnimationFrame(updateActiveSection);
    };

    updateActiveSection();

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    window.addEventListener("resize", handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      window.removeEventListener("resize", handleScroll);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  return (
    <header
      className="site-header"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setMenuOpen(false);
        }
      }}
    >
      <div className="container site-header__inner">
        <a
          className="site-header__brand"
          href="#home"
          aria-label="Learners Commercial Institute home"
          onClick={() => setMenuOpen(false)}
        >
          <img
            className="site-header__brand-logo"
            src="/learners-logo-mark.png"
            alt=""
            aria-hidden="true"
          />

          <span className="site-header__brand-text">
            <strong>Learners</strong>
            <span>Commercial Institute</span>
          </span>
        </a>

        <nav className="site-header__nav" aria-label="Primary navigation">
          {navItems.map((item) => {
            const isActive = activeSection === item.key;

            return (
              <a
                key={item.href}
                href={item.href}
                className={`site-header__nav-link${
                  isActive ? " site-header__nav-link--active" : ""
                }`}
                aria-current={isActive ? "location" : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <div className="site-header__actions">

          <a
            className="site-header__staff-profile"
            href="/admin/login"
            aria-label="Staff login"
            title="Staff login"
          >
            <UserRound size={18} strokeWidth={2} aria-hidden="true" />
          </a>

          <button
            className="site-header__menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? (
              <X size={22} aria-hidden="true" />
            ) : (
              <Menu size={22} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <nav
        id="mobile-navigation"
        className="site-header__mobile-nav"
        aria-label="Mobile navigation"
        hidden={!menuOpen}
      >
        {navItems.map((item) => {
          const isActive = activeSection === item.key;

          return (
            <a
              key={item.href}
              href={item.href}
              className={
                isActive ? "site-header__mobile-nav-link--active" : undefined
              }
              aria-current={isActive ? "location" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}

              <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          );
        })}
      </nav>
    </header>
  );
}
