import { useRef, useState } from "react";
import "./Courses.css";

import {
  ArrowRight,
  BookOpen,
  createLucideIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  Laptop2,
  NotebookPen,
  FileText,
  Landmark,
  LayoutGrid,
  Monitor,
  PenLine,
  Table2,
} from "lucide-react";

import { usePublicCourses } from "../hooks/usePublicCourses";
import { PublicCourseDetailsDialog } from "../components/PublicCourseDetailsDialog";

// Typewriter drawn in the same 24px outline style as the other icons.
const Typewriter = createLucideIcon("CourseTypewriter", [
  ["rect", { x: "7", y: "2", width: "10", height: "9", rx: "1", key: "paper" }],
  ["path", { d: "M10 5h4M10 8h4", key: "text" }],
  ["path", { d: "M3 10h18", key: "carriage" }],
  ["path", {
    d: "M5 10 2.5 19a2 2 0 0 0 2 2.5h15a2 2 0 0 0 2-2.5L19 10",
    key: "body"
  }],
  ["path", {
    d: "M7 14h.01M10.3 14h.01M13.7 14h.01M17 14h.01M6 17h.01M9 17h.01M12 17h.01M15 17h.01M18 17h.01",
    key: "keys"
  }],
  ["path", { d: "M9 20h6", key: "spacebar" }],
]);

export type CourseCategory = (typeof quickFilters)[number];

type CoursesProps = {
  onEnquire?: (courseId: string) => void;
  categorySelection?: {
    category: CourseCategory;
    requestId: number;
  } | null;
};

// Same icons as the hero pathways, so each category reads consistently.
const categoryIcons: Record<string, typeof BookOpen> = {
  typewriting: Typewriter,
  shorthand: NotebookPen,
  "computer courses": Laptop2,
  "exam preparation": ClipboardCheck,
};

// Course-specific icons; category icons remain the fallback for new courses.
const courseIcons: Record<string, typeof BookOpen> = {
  "english typewriting - lower": Typewriter,
  "english typewriting - higher": Typewriter,
  "malayalam typewriting - lower": Typewriter,
  "malayalam typewriting - higher": Typewriter,
  "english shorthand": NotebookPen,
  "malayalam shorthand": PenLine,
  "computer word processing": FileText,
  "computer basics": Monitor,
  "microsoft 365": LayoutGrid,
  "ssc training": ClipboardCheck,
  "psc training": Landmark,
  "advanced microsoft excel": Table2,
};

function getCourseIcon(title: string, category?: string | null) {
  const normalizedTitle = title.trim().toLowerCase()
    .replace(/[–—]/g, "-").replace(/\s+/g, " ");

  return courseIcons[normalizedTitle]
    ?? categoryIcons[category?.trim().toLowerCase() ?? ""]
    ?? BookOpen;
}

const quickFilters = [
  "All Courses",
  "Typewriting",
  "Shorthand",
  "Computer Courses",
  "Exam Preparation",
] as const;

export function Courses({ onEnquire, categorySelection = null }: CoursesProps) {
  const query = usePublicCourses();
  const courses = query.data ?? [];

  const [expandedCourses, setExpandedCourses] = useState<
    Record<string, boolean>
  >({});
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [showAllMobileCourses, setShowAllMobileCourses] = useState(false);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);

  const [activeFilter, setActiveFilter] =
    useState<CourseCategory>("All Courses");
  const [appliedCategoryId, setAppliedCategoryId] = useState<number | null>(
    null,
  );

  // Hero shortcuts ask for a category; apply each request once.
  if (
    categorySelection &&
    categorySelection.requestId !== appliedCategoryId
  ) {
    setAppliedCategoryId(categorySelection.requestId);
    setActiveFilter(categorySelection.category);
  }

  const filteredCourses =
    activeFilter === "All Courses"
      ? courses
      : courses.filter(
          (course) =>
            course.category?.trim().toLowerCase() ===
            activeFilter.toLowerCase(),
        );

  const featuredTitles = [
    "english typewriting - lower",
    "english shorthand",
    "computer word processing",
  ];

  const featuredCourses = featuredTitles
    .map((title) =>
      filteredCourses.find(
        (course) => course.title.trim().toLowerCase() === title,
      ),
    )
    .filter((course): course is (typeof filteredCourses)[number] =>
      Boolean(course),
    );

  const otherCourses = filteredCourses.filter(
    (course) => !featuredCourses.some((featured) => featured.id === course.id),
  );

  const mobileOrderedCourses = [
    ...featuredCourses,
    ...otherCourses,
  ];

  const selectedCourse =
    courses.find((course) => course.id === selectedCourseId) ?? null;

  const toggleMobileCourses = () => {
    const isCollapsing = showAllMobileCourses;

    setShowAllMobileCourses(!isCollapsing);

    if (isCollapsing) {
      // Hidden cards above the button shift it up; bring it back into view.
      requestAnimationFrame(() => {
        mobileToggleRef.current?.scrollIntoView({ block: "center" });
      });
    }
  };

  const toggleCourse = (courseId: string) => {
    setExpandedCourses((current) => ({
      ...current,
      [courseId]: !current[courseId],
    }));
  };

  return (
    <section id="courses" className="courses-section section">
      <div className="container">
        <div className="courses-section__header">
          <div>
            <span className="courses-section__eyebrow">Courses & Training</span>

            <h2 className="courses-section__title">
              Find the right place to begin.
            </h2>
          </div>

          <p className="courses-section__intro">
            From keyboard fundamentals to professional documentation, choose
            training that supports your next step.
          </p>
        </div>

        <div
          className="courses-section__filters"
          aria-label="Course categories"
        >
          {quickFilters.map((filter) => (
            <button
              key={filter}
              type="button"
              className={`courses-section__filter${
                activeFilter === filter ? " is-active" : ""
              }`}
              onClick={() => setActiveFilter(filter)}
              aria-pressed={activeFilter === filter}
            >
              {filter}
            </button>
          ))}
        </div>

        {query.isPending && (
          <div className="courses-loading" role="status" aria-live="polite">
            <span className="courses-loading__sr-only">Loading courses…</span>

            <div className="courses-section__grid" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <article
                  className="course-card course-card--skeleton"
                  key={index}
                >
                  <div className="course-card__top">
                    <span className="course-skeleton course-skeleton--icon" />

                    <span className="course-skeleton course-skeleton--number" />
                  </div>

                  <span className="course-skeleton course-skeleton--title" />

                  <div className="course-skeleton__description">
                    <span className="course-skeleton course-skeleton--line" />
                    <span className="course-skeleton course-skeleton--line" />
                    <span className="course-skeleton course-skeleton--line course-skeleton--short" />
                  </div>

                  <div className="course-skeleton__skills">
                    <span>
                      <i className="course-skeleton course-skeleton--dot" />
                      <i className="course-skeleton course-skeleton--skill" />
                    </span>

                    <span>
                      <i className="course-skeleton course-skeleton--dot" />
                      <i className="course-skeleton course-skeleton--skill course-skeleton--skill-short" />
                    </span>

                    <span>
                      <i className="course-skeleton course-skeleton--dot" />
                      <i className="course-skeleton course-skeleton--skill" />
                    </span>
                  </div>

                  <span className="course-skeleton course-skeleton--link" />
                </article>
              ))}
            </div>
          </div>
        )}
        {query.isError && (
          <div className="courses-section__feedback" role="alert">
            <p>
              Unable to refresh courses.{" "}
              {query.data
                ? "Showing the last available catalogue."
                : "Please try again."}
            </p>
            <button
              type="button"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              Try again
            </button>
          </div>
        )}
        {query.isSuccess && courses.length === 0 && (
          <p role="status">
            New courses will be listed here soon. Contact us for training and
            admission information.
          </p>
        )}
        <div id="courses-list" className="courses-section__grid">
          {(activeFilter === "All Courses"
            ? mobileOrderedCourses
            : filteredCourses
          ).map((course, index) => {
            const hideOnMobile =
              activeFilter === "All Courses" &&
              !showAllMobileCourses &&
              index >= 3;

            const CategoryIcon = getCourseIcon(course.title, course.category);
            const isExpanded = Boolean(expandedCourses[course.id]);
            const descriptionText =
              course.shortDescription || course.description || "";
            const hasReadMore =
              descriptionText.length > 120 || course.skills.length > 3;
            const visibleSkills = isExpanded
              ? course.skills
              : course.skills.slice(0, 3);

            return (
              <article
                className={`course-card${
                  hideOnMobile ? " course-card--mobile-hidden" : ""
                }`}
                key={course.id}
              >
                <div className="course-card__top">
                  <div className="course-card__icon" aria-hidden="true">
                    <CategoryIcon size={24} strokeWidth={1.8} />
                  </div>

                  <span className="course-card__number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3>{course.title}</h3>

                {descriptionText && (
                  <p
                    className={`course-card__description ${isExpanded ? "is-expanded" : ""}`}
                  >
                    {descriptionText}
                  </p>
                )}

                {hasReadMore && (
                  <button
                    type="button"
                    className="course-card__read-more"
                    onClick={() => toggleCourse(String(course.id))}
                    aria-expanded={isExpanded}
                  >
                    {isExpanded ? "Read less" : "Read more"}
                  </button>
                )}

                {visibleSkills.length > 0 && (
                  <ul className="course-card__highlights">
                    {visibleSkills.map((highlight, skillIndex) => (
                      <li key={`${course.id}-${skillIndex}`}>
                        <span aria-hidden="true">
                          <Check size={14} strokeWidth={2.4} />
                        </span>

                        {highlight}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  className="course-card__link"
                  onClick={() => setSelectedCourseId(course.id)}
                  aria-label={`View details for ${course.title}`}
                >
                  View course details
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </article>
            );
          })}
        </div>

        {activeFilter === "All Courses" && mobileOrderedCourses.length > 3 && (
          <button
            type="button"
            ref={mobileToggleRef}
            className="courses-section__mobile-toggle"
            onClick={toggleMobileCourses}
            aria-expanded={showAllMobileCourses}
            aria-controls="courses-list"
          >
            {showAllMobileCourses
              ? "Show Less"
              : "View More"}
            {showAllMobileCourses ? (
              <ChevronUp size={18} aria-hidden="true" />
            ) : (
              <ChevronDown size={18} aria-hidden="true" />
            )}
          </button>
        )}

        {selectedCourse && (
          <PublicCourseDetailsDialog
            course={selectedCourse}
            onClose={() => setSelectedCourseId(null)}
            onEnquire={onEnquire}
          />
        )}

        <p className="courses-section__note">
          Contact the institute for current course details, schedules, and
          admission information.
        </p>
      </div>
    </section>
  );
}
