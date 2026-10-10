import { useState } from "react";
import "./Courses.css";

import { ArrowRight, BookOpen, Check } from "lucide-react";

import { usePublicCourses } from "../hooks/usePublicCourses";

export function Courses() {
  const query = usePublicCourses();
  const courses = query.data ?? [];
  const [expandedCourses, setExpandedCourses] = useState<
    Record<string, boolean>
  >({});

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

        {query.isPending && <p role="status">Loading courses…</p>}
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
        <div className="courses-section__grid">
          {courses.map((course, index) => {
            const isExpanded = Boolean(expandedCourses[course.id]);
            const descriptionText =
              course.shortDescription || course.description || "";
            const hasReadMore =
              descriptionText.length > 120 || course.skills.length > 3;
            const visibleSkills = isExpanded
              ? course.skills
              : course.skills.slice(0, 3);

            return (
              <article className="course-card" key={course.id}>
                <div className="course-card__top">
                  <div className="course-card__icon" aria-hidden="true">
                    <BookOpen size={24} strokeWidth={1.8} />
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

                <a className="course-card__link" href="#enquiry">
                  Enquire about this course
                  <ArrowRight size={16} aria-hidden="true" />
                </a>
              </article>
            );
          })}
        </div>

        <p className="courses-section__note">
          Contact the institute for current course details, schedules, and
          admission information.
        </p>
      </div>
    </section>
  );
}
