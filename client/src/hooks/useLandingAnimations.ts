import { useLayoutEffect } from "react";

const REVEAL_SELECTOR = [
  ".courses-section__header",
  ".course-card",
  ".about-section__content",
  ".about-feature",
  ".why-section__header",
  ".why-card",
  ".voices-stat",
  ".voices-section__header",
  ".voice-card",
  ".faq-section__intro",
  ".faq-item",
  ".contact-section__header",
  ".contact-card",
  ".contact-map",
  ".enquiry-section__content",
  ".enquiry-section__form-card",
  ".site-footer__main",
  ".site-footer__bottom",
].join(",");

export function useLandingAnimations() {
  useLayoutEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing-page");

    if (!root) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const finePointer = window.matchMedia(
      "(hover: hover) and (pointer: fine)",
    ).matches;

    const observed = new WeakSet<Element>();

    const observer = reducedMotion
      ? null
      : new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;

              entry.target.classList.add("is-visible");
              observer?.unobserve(entry.target);
            });
          },
          {
            threshold: 0.12,
            rootMargin: "0px 0px -7% 0px",
          },
        );

    const registerRevealElements = () => {
      root
        .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
        .forEach((element) => {
          if (observed.has(element)) return;

          observed.add(element);
          element.classList.add("reveal");

          const parent = element.parentElement;

          if (parent) {
            const siblings = Array.from(
              parent.querySelectorAll<HTMLElement>(
                REVEAL_SELECTOR,
              ),
            );

            const index = siblings.indexOf(element);

            if (index >= 0) {
              element.style.setProperty(
                "--reveal-delay",
                `${Math.min(index * 65, 260)}ms`,
              );
            }
          }

          if (reducedMotion) {
            element.classList.add("is-visible");
          } else {
            observer?.observe(element);
          }
        });
    };

    registerRevealElements();

    const mutationObserver = new MutationObserver(() => {
      registerRevealElements();
    });

    mutationObserver.observe(root, {
      childList: true,
      subtree: true,
    });

    const hero = root.querySelector<HTMLElement>(".hero-section");
    const guide = root.querySelector<HTMLElement>(".learning-guide");

    const handleHeroPointer = (event: PointerEvent) => {
      if (!hero || !finePointer || reducedMotion) return;

      const rect = hero.getBoundingClientRect();

      const x =
        ((event.clientX - rect.left) / rect.width) * 100;

      const y =
        ((event.clientY - rect.top) / rect.height) * 100;

      hero.style.setProperty("--pointer-x", `${x}%`);
      hero.style.setProperty("--pointer-y", `${y}%`);
    };

    const resetHeroPointer = () => {
      hero?.style.setProperty("--pointer-x", "68%");
      hero?.style.setProperty("--pointer-y", "32%");
    };

    const handleGuidePointer = (event: PointerEvent) => {
      if (!guide || !finePointer || reducedMotion) return;

      const rect = guide.getBoundingClientRect();

      const x =
        (event.clientX - rect.left) / rect.width - 0.5;

      const y =
        (event.clientY - rect.top) / rect.height - 0.5;

      const rotateY = x * 4;
      const rotateX = y * -4;

      guide.style.setProperty(
        "--guide-tilt-x",
        `${rotateX.toFixed(2)}deg`,
      );

      guide.style.setProperty(
        "--guide-tilt-y",
        `${rotateY.toFixed(2)}deg`,
      );
    };

    const resetGuide = () => {
      guide?.style.setProperty("--guide-tilt-x", "0deg");
      guide?.style.setProperty("--guide-tilt-y", "0deg");
    };

    if (finePointer && !reducedMotion) {
      hero?.addEventListener(
        "pointermove",
        handleHeroPointer,
        { passive: true },
      );

      hero?.addEventListener(
        "pointerleave",
        resetHeroPointer,
      );

      guide?.addEventListener(
        "pointermove",
        handleGuidePointer,
        { passive: true },
      );

      guide?.addEventListener(
        "pointerleave",
        resetGuide,
      );
    }

    requestAnimationFrame(() => {
      root.classList.add("landing-page--ready");
    });

    return () => {
      observer?.disconnect();
      mutationObserver.disconnect();

      hero?.removeEventListener(
        "pointermove",
        handleHeroPointer,
      );

      hero?.removeEventListener(
        "pointerleave",
        resetHeroPointer,
      );

      guide?.removeEventListener(
        "pointermove",
        handleGuidePointer,
      );

      guide?.removeEventListener(
        "pointerleave",
        resetGuide,
      );
    };
  }, []);
}
