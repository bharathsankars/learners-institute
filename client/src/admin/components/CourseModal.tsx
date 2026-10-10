import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, BookOpen, Check, LoaderCircle, X } from "lucide-react";

import type {
  Course,
  CreateCourseInput,
  UpdateCourseInput,
} from "../../api/courses";

import "../styles/AddStudentModal.css";
import "../styles/CourseModal.css";

type CourseModalProps = {
  open: boolean;
  course?: Course | null;
  isSubmitting: boolean;
  serverError?: string;
  onClose: () => void;
  onCreate: (input: CreateCourseInput) => Promise<void>;
  onUpdate: (courseId: string, input: UpdateCourseInput) => Promise<void>;
};

type CourseFormState = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string;
  skills: string;
  isActive: boolean;
  displayOrder: string;
};

const emptyForm: CourseFormState = {
  title: "",
  slug: "",
  shortDescription: "",
  description: "",
  category: "",
  skills: "",
  isActive: true,
  displayOrder: "0",
};

function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getInitialForm(course?: Course | null): CourseFormState {
  if (!course) {
    return {
      ...emptyForm,
    };
  }

  return {
    title: course.title,
    slug: course.slug,

    shortDescription: course.shortDescription ?? "",

    description: course.description ?? "",

    category: course.category ?? "",

    skills: course.skills.join(", "),

    isActive: course.isActive,

    displayOrder: String(course.displayOrder),
  };
}

type CourseFormProps = Omit<CourseModalProps, "open">;

function CourseForm({
  course,
  isSubmitting,
  serverError,
  onClose,
  onCreate,
  onUpdate,
}: CourseFormProps) {
  const isEditing = Boolean(course);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const [form, setForm] = useState<CourseFormState>(() =>
    getInitialForm(course),
  );

  const [error, setError] = useState("");

  const [slugEdited, setSlugEdited] = useState(Boolean(course));

  const updateField = <K extends keyof CourseFormState>(
    field: K,
    value: CourseFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const handleTitleChange = (value: string) => {
    setForm((current) => ({
      ...current,

      title: value,

      slug: slugEdited ? current.slug : createSlug(value),
    }));

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const title = form.title.trim();

    const slug = form.slug.trim();

    if (title.length < 2) {
      setError("Enter a course title with at least 2 characters.");

      return;
    }

    if (slug.length < 2) {
      setError("Enter a slug with at least 2 characters.");

      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError(
        "Slug may contain lowercase letters, numbers, and hyphens only.",
      );

      return;
    }

    const displayOrder = Number(form.displayOrder);

    if (!form.displayOrder.trim() || !Number.isSafeInteger(displayOrder) || displayOrder < 0 || displayOrder > 2147483647) {
      setError("Enter a whole display order between 0 and 2,147,483,647.");

      return;
    }

    const skills = form.skills
      .split(",")
      .map((skill) => skill.trim())
      .filter(Boolean);

    const input: CreateCourseInput = {
      title,
      slug,
      skills,

      isActive: form.isActive,

      displayOrder,

      ...(form.shortDescription.trim()
        ? {
            shortDescription: form.shortDescription.trim(),
          }
        : {}),

      ...(form.description.trim()
        ? {
            description: form.description.trim(),
          }
        : {}),

      ...(form.category.trim()
        ? {
            category: form.category.trim(),
          }
        : {}),
    };

    try {
      if (course) {
        await onUpdate(course.id, input);

        return;
      }

      await onCreate(input);
    } catch {
      // Parent mutation supplies
      // serverError to this modal.
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="student-modal"
      aria-labelledby="student-modal-title"
      aria-describedby="student-modal-description"
      onCancel={(event) => { event.preventDefault(); if (!isSubmitting) onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget && !isSubmitting) {
        const bounds = event.currentTarget.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
      } }}
    >
        <div className="student-modal__header">
          <div className="student-modal__heading">
            <div className="student-modal__heading-icon">
              <BookOpen size={20} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <div>
              <span className="student-modal__eyebrow">Course management</span>

              <h2 id="student-modal-title">
                {isEditing ? "Edit course" : "Add a course"}
              </h2>
              <p id="student-modal-description">{isEditing ? "Update course information and availability." : "Create a course with the details learners need."}</p>
            </div>
          </div>

          <button
            className="student-modal__close"
            type="button"
            onClick={onClose}
            aria-label="Close course form"
            disabled={isSubmitting}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="student-modal__form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className="student-modal__body">
          <div className="student-modal__admission">
            <span className="student-modal__admission-icon"><BookOpen size={19} aria-hidden="true" /></span>
            <div><span>Course catalogue</span><strong>{isEditing ? "Update your course" : "Create a new course"}</strong><p>Add the essentials, an overview and the skills learners will gain.</p></div>
            <span className="student-modal__active-badge">{form.isActive ? "Active course" : "Inactive course"}</span>
          </div>
          <p className="student-modal__required-note">Fields marked <span className="student-modal__required" aria-hidden="true">*</span> are required.</p>
          <fieldset className="student-modal__fields" disabled={isSubmitting}>
          <section className="student-modal__section">
          <div className="student-modal__section-heading"><span>01</span><div><h3>Course essentials</h3><p>The course name, category and catalogue order.</p></div></div>
          <div className="student-modal__grid">
            <div className="student-modal__field student-modal__field--full">
              <label htmlFor="course-title">
                Course title
                <span className="student-modal__required" aria-hidden="true">*</span>
              </label>

              <input
                id="course-title"
                type="text"
                value={form.title}
                onChange={(event) => handleTitleChange(event.target.value)}
                placeholder="Enter course title"
                maxLength={150}
                disabled={isSubmitting}
                required
                minLength={2}
                autoFocus
              />
            </div>

            <div className="student-modal__field student-modal__field--full">
              <label htmlFor="course-slug">
                URL slug
                <span className="student-modal__required" aria-hidden="true">*</span>
              </label>

              <input
                id="course-slug"
                type="text"
                value={form.slug}
                onChange={(event) => {
                  setSlugEdited(true);

                  updateField("slug", event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                required
                minLength={2}
                placeholder="english-typewriting"
                maxLength={150}
                disabled={isSubmitting}
              />

              <small className="student-modal__field-help">
                Generated from the title. Use lowercase letters, numbers and hyphens.
              </small>
            </div>

            <div className="student-modal__field">
              <label htmlFor="course-category">Category</label>

              <input
                id="course-category"
                type="text"
                value={form.category}
                onChange={(event) =>
                  updateField("category", event.target.value)
                }
                placeholder="Optional category"
                disabled={isSubmitting}
              />
            </div>

            <div className="student-modal__field">
              <label htmlFor="course-display-order">Display order</label>

              <small className="student-modal__field-help">Lower numbers appear first.</small>
              <input
                id="course-display-order"
                type="number"
                required
                max="2147483647"
                min="0"
                step="1"
                value={form.displayOrder}
                onChange={(event) =>
                  updateField("displayOrder", event.target.value)
                }
                disabled={isSubmitting}
              />
            </div>

          </div>
          </section>
          <section className="student-modal__section">
          <div className="student-modal__section-heading"><span>02</span><div><h3>Overview &amp; skills</h3><p>What learners can expect from this course.</p></div></div>
          <div className="student-modal__grid">
            <div className="student-modal__field student-modal__field--full">
              <label htmlFor="course-short-description">
                Short description
              </label>

              <textarea
                id="course-short-description"
                value={form.shortDescription}
                onChange={(event) =>
                  updateField("shortDescription", event.target.value)
                }
                placeholder="A concise introduction to what learners will gain"
                maxLength={300}
                rows={3}
                disabled={isSubmitting}
              />
              <small className="course-form__count">{form.shortDescription.length} / 300 characters</small>
            </div>

            <div className="student-modal__field student-modal__field--full">
              <label htmlFor="course-description">Full description</label>

              <textarea
                id="course-description"
                value={form.description}
                onChange={(event) =>
                  updateField("description", event.target.value)
                }
                placeholder="Detailed course information"
                maxLength={5000}
                rows={5}
                disabled={isSubmitting}
              />
              <small className="course-form__count">{form.description.length} / 5,000 characters</small>
            </div>

            <div className="student-modal__field student-modal__field--full">
              <label htmlFor="course-skills">Skills / highlights</label>

              <input
                id="course-skills"
                type="text"
                value={form.skills}
                onChange={(event) => updateField("skills", event.target.value)}
                placeholder="Typing, Office skills, Computer basics"
                disabled={isSubmitting}
              />

              <small className="student-modal__field-help">Separate multiple items with commas.</small>
            </div>

          </div>
          </section>
          <section className="student-modal__section">
          <div className="student-modal__section-heading"><span>03</span><div><h3>Availability</h3><p>Manage the course’s status in your catalogue.</p></div></div>
            <div className="student-modal__field student-modal__field--full">
              <label className="course-form__toggle">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) =>
                    updateField("isActive", event.target.checked)
                  }
                  disabled={isSubmitting}
                />

                <span>
                  <strong>Active course</strong>

                  <small className="student-modal__field-help">
                    Keep this course active in your catalogue. Uncheck to mark it inactive.
                  </small>
                </span>
              </label>
            </div>
          </section>

          </fieldset>

          {(error || serverError) && (
            <div className="student-modal__server-error" role="alert">
              {error || serverError}
            </div>
          )}

          </div>
          <footer className="student-modal__actions">
            <span className="student-modal__save-note"><Check size={14} aria-hidden="true" />Course details are saved to the catalogue</span>
            <div>
            <button
              className="student-modal__cancel"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              className="student-modal__submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? <LoaderCircle className="student-modal__spinner" size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save changes"
                  : "Add course"}
            </button>
            </div>
          </footer>
        </form>
    </dialog>
  );
}

export function CourseModal({ open, course, ...props }: CourseModalProps) {
  if (!open) {
    return null;
  }

  return (
    <CourseForm key={course?.id ?? "new-course"} course={course} {...props} />
  );
}
