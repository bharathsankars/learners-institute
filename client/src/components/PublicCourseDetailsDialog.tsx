import {
  ArrowRight,
  BookOpen,
  Check,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
} from "react";

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
  const dialogRef =
    useRef<HTMLDialogElement>(null);

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
    course.description ||
    course.shortDescription ||
    "Contact the institute for more information about this course.";

  return (
    <dialog
      ref={dialogRef}
      className="public-course-dialog"
      aria-labelledby="public-course-dialog-title"
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
      <div className="public-course-dialog__panel">
        <header className="public-course-dialog__header">
          <div className="public-course-dialog__heading">
            <span
              className="public-course-dialog__icon"
              aria-hidden="true"
            >
              <BookOpen
                size={24}
                strokeWidth={1.8}
              />
            </span>

            <div>
              <span className="public-course-dialog__eyebrow">
                Course details
              </span>

              <h2 id="public-course-dialog-title">
                {course.title}
              </h2>
            </div>
          </div>

          <button
            className="public-course-dialog__close"
            type="button"
            onClick={onClose}
            aria-label="Close course details"
          >
            <X
              size={20}
              aria-hidden="true"
            />
          </button>
        </header>

        <div className="public-course-dialog__body">
          {course.category && (
            <span className="public-course-dialog__category">
              {course.category}
            </span>
          )}

          <section>
            <h3>About this course</h3>

            <p>{description}</p>
          </section>

          {course.skills.length > 0 && (
            <section>
              <h3>What you can learn</h3>

              <ul className="public-course-dialog__skills">
                {course.skills.map(
                  (skill, index) => (
                    <li
                      key={`${course.id}-${index}`}
                    >
                      <span aria-hidden="true">
                        <Check
                          size={14}
                          strokeWidth={2.4}
                        />
                      </span>

                      {skill}
                    </li>
                  ),
                )}
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

            <ArrowRight
              size={17}
              aria-hidden="true"
            />
          </a>

          <button
            className="public-course-dialog__secondary"
            type="button"
            onClick={onClose}
          >
            Continue browsing
          </button>
        </footer>
      </div>
    </dialog>
  );
}
