import { type CSSProperties, useEffect, useState } from "react";

const HEADLINE = "Welcome to Learners.";

// Characters from this index onward are struck with the red half of the
// ribbon, like a two-colour typewriter.
const RED_INK_FROM = HEADLINE.indexOf("Learners");

const START_DELAY_MS = 1300;
const BASE_KEYSTROKE_MS = 105;
const HOLD_AFTER_TYPING_MS = 2400;

const SCALE_TICKS = 41;

// Slight variation per keystroke so the typing reads as human, with a
// short pause after spaces and punctuation.
function keystrokeDelay(character: string) {
  const jitter = Math.random() * 40 - 15;

  if (character === " ") {
    return BASE_KEYSTROKE_MS + 70 + jitter;
  }

  if (character === ".") {
    return BASE_KEYSTROKE_MS + 120;
  }

  return BASE_KEYSTROKE_MS + jitter;
}

// Real typebars never land perfectly: each letter sits a hair off the
// baseline and carries a slightly different amount of ink.
function createStrikeMarks() {
  return Array.from(HEADLINE, () => ({
    "--strike-shift": `${(Math.random() - 0.5) * 1.6}px`,
    "--strike-ink": (0.84 + Math.random() * 0.16).toFixed(2),
  })) as CSSProperties[];
}

type LoginWelcomeTransitionProps = {
  fullName?: string;
  onComplete: () => void;
};

export function LoginWelcomeTransition({
  fullName,
  onComplete,
}: LoginWelcomeTransitionProps) {
  const [prefersReducedMotion] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const [typedLength, setTypedLength] = useState(
    prefersReducedMotion ? HEADLINE.length : 0,
  );

  const [strikeMarks] = useState(createStrikeMarks);

  const [today] = useState(() =>
    new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );

  const isDoneTyping = typedLength >= HEADLINE.length;

  useEffect(() => {
    if (prefersReducedMotion) {
      const timer = window.setTimeout(onComplete, 2500);

      return () => window.clearTimeout(timer);
    }

    let timer: number;
    let index = 0;

    const typeNext = () => {
      index += 1;
      setTypedLength(index);

      if (index < HEADLINE.length) {
        timer = window.setTimeout(
          typeNext,
          keystrokeDelay(HEADLINE[index - 1]),
        );
      } else {
        timer = window.setTimeout(onComplete, HOLD_AFTER_TYPING_MS);
      }
    };

    timer = window.setTimeout(typeNext, START_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [onComplete, prefersReducedMotion]);

  return (
    <div
      className="learners-welcome"
      role="status"
      aria-live="polite"
      aria-label={`${HEADLINE} Signing you in.`}
    >
      <article className="learners-welcome__sheet">
        {/* Letterhead */}

        <header className="learners-welcome__letterhead">
          <img src="/learners-logo-mark.png" alt="" aria-hidden="true" />

          <div>
            <strong>Learners</strong>
            <span>Commercial Institute</span>
          </div>

          <time className="learners-welcome__date">{today}</time>
        </header>

        <div className="learners-welcome__line">
          {/* Carriage scale: the pointer follows each keystroke */}

          <div className="learners-welcome__scale" aria-hidden="true">
            {Array.from({ length: SCALE_TICKS }, (_, tick) => (
              <span
                key={tick}
                className={
                  tick % 5 === 0
                    ? "learners-welcome__tick learners-welcome__tick--major"
                    : "learners-welcome__tick"
                }
              />
            ))}

            <span
              className="learners-welcome__pointer"
              style={{ left: `${(typedLength / HEADLINE.length) * 100}%` }}
            />
          </div>

          {/* Headline: ghost text reserves space, typed text sits on top */}

          <h1 className="learners-welcome__headline" aria-hidden="true">
            <span className="learners-welcome__ghost">
              {HEADLINE}
              <span className="learners-welcome__caret" />
            </span>

            <span className="learners-welcome__typed">
              {Array.from(HEADLINE.slice(0, typedLength), (character, index) =>
                // Spaces stay plain text so the line can still wrap on phones
                character === " " ? (
                  " "
                ) : (
                  <span
                    key={index}
                    className={
                      index >= RED_INK_FROM
                        ? "learners-welcome__strike learners-welcome__strike--red"
                        : "learners-welcome__strike"
                    }
                    style={strikeMarks[index]}
                  >
                    {character}
                  </span>
                ),
              )}

              <span
                className={
                  isDoneTyping
                    ? "learners-welcome__caret learners-welcome__caret--idle"
                    : "learners-welcome__caret"
                }
              />
            </span>
          </h1>
        </div>

        <p
          className={
            isDoneTyping
              ? "learners-welcome__subline learners-welcome__subline--visible"
              : "learners-welcome__subline"
          }
        >
          {fullName && <em>Good to see you, {fullName}.</em>}
          <span>Preparing your workspace</span>
        </p>

        <footer className="learners-welcome__footer">
          Thirunakkara · Kottayam
        </footer>
      </article>
    </div>
  );
}
