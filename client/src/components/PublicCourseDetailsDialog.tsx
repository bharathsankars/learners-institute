import { ArrowRight, BookOpen, Check, X } from "lucide-react";
import { useEffect, useRef } from "react";

import type { Course } from "../api/courses";

import "./PublicCourseDetailsDialog.css";

type PublicCourseDetailsDialogProps = {
  course: Course;
  onClose: () => void;
  onEnquire?: (courseId: string) => void;
};

export function PublicCourseDetailsDialog({
  course,
  onClose,
  onEnquire,
}: PublicCourseDetailsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  const handleEnquire = () => {
    onEnquire?.(course.id);
    onClose();
  };

  const description =
    course.description?.trim() ||
    course.shortDescription?.trim() ||
    "Contact Learners Commercial Institute for more information about this course.";

  const hasSkills = Array.isArray(course.skills) && course.skills.length > 0;

  return (
    <dialog
      ref={dialogRef}
      className="public-course-dialog"
      aria-labelledby="public-course-dialog-title"
      aria-describedby="public-course-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <article className="public-course-dialog__panel">
        <header className="public-course-dialog__header">
          <div className="public-course-dialog__heading">
            <div className="public-course-dialog__icon" aria-hidden="true">
              <BookOpen size={23} strokeWidth={1.7} />
            </div>

            <div className="public-course-dialog__heading-content">
              <span className="public-course-dialog__eyebrow">
                Learners Commercial Institute
              </span>

              <h2 id="public-course-dialog-title">{course.title}</h2>

              {course.category && (
                <span className="public-course-dialog__category">
                  {course.category}
                </span>
              )}
            </div>
          </div>

          <button
            className="public-course-dialog__close"
            type="button"
            onClick={onClose}
            aria-label="Close course details"
          >
            <X size={19} strokeWidth={1.8} aria-hidden="true" />
          </button>
        </header>

        <div className="public-course-dialog__body">
          <section className="public-course-dialog__section">
            <span className="public-course-dialog__section-label">
              Course overview
            </span>

            <p
              id="public-course-dialog-description"
              className="public-course-dialog__description"
            >
              {description}
            </p>
          </section>

          {hasSkills && (
            <section className="public-course-dialog__section">
              <div className="public-course-dialog__section-heading">
                <div>
                  <span className="public-course-dialog__section-label">
                    Learning outcomes
                  </span>

                  <h3>What you can learn</h3>
                </div>

                <span className="public-course-dialog__skill-count">
                  {course.skills.length}{" "}
                  {course.skills.length === 1 ? "topic" : "topics"}
                </span>
              </div>

              <ul className="public-course-dialog__skills">
                {course.skills.map((skill, index) => (
                  <li key={`${course.id}-${index}`}>
                    <span
                      className="public-course-dialog__check"
                      aria-hidden="true"
                    >
                      <Check size={14} strokeWidth={2.4} />
                    </span>

                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <footer className="public-course-dialog__footer">
          <a
            className="public-course-dialog__enquire"
            href="#enquiry"
            onClick={handleEnquire}
          >
            Enquire about this course
            <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
          </a>

          <button
            className="public-course-dialog__secondary"
            type="button"
            onClick={onClose}
          >
            Continue browsing
          </button>
        </footer>
      </article>
    </dialog>
  );
}
