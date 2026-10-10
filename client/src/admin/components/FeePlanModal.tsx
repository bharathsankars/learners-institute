import { type FormEvent, useState } from "react";
import { IndianRupee, X } from "lucide-react";

import type { Course } from "../../api/courses";

import {
  formatIndianRupees,
  rupeesToPaise,
  type CreateFeePlanInput,
  type FeePlan,
  type UpdateFeePlanInput,
} from "../../api/fees";

import type { Student } from "../../api/students";

import "../styles/FeePlanModal.css";

type FeePlanModalProps = {
  open: boolean;

  feePlan?: FeePlan | null;

  students: Student[];
  courses: Course[];

  isSubmitting: boolean;

  serverError?: string;

  onClose: () => void;

  onCreate: (input: CreateFeePlanInput) => Promise<void>;

  onUpdate: (feePlanId: string, input: UpdateFeePlanInput) => Promise<void>;
};

type FeeFormState = {
  studentId: string;
  courseId: string;

  totalFee: string;
  discount: string;

  dueDate: string;
  notes: string;
};

function paiseToInputValue(paise: number): string {
  return String(paise / 100);
}

function getDateInputValue(value: string | null): string {
  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

function getInitialForm(feePlan?: FeePlan | null): FeeFormState {
  if (!feePlan) {
    return {
      studentId: "",
      courseId: "",
      totalFee: "",
      discount: "0",
      dueDate: "",
      notes: "",
    };
  }

  return {
    studentId: feePlan.enrollment.studentId,

    courseId: feePlan.enrollment.courseId,

    totalFee: paiseToInputValue(feePlan.totalFeePaise),

    discount: paiseToInputValue(feePlan.discountPaise),

    dueDate: getDateInputValue(feePlan.dueDate),

    notes: feePlan.notes ?? "",
  };
}

type FeePlanFormProps = Omit<FeePlanModalProps, "open">;

function FeePlanForm({
  feePlan,
  students,
  courses,
  isSubmitting,
  serverError,
  onClose,
  onCreate,
  onUpdate,
}: FeePlanFormProps) {
  const isEditing = Boolean(feePlan);

  const [form, setForm] = useState<FeeFormState>(() => getInitialForm(feePlan));

  const [error, setError] = useState("");

  const updateField = <K extends keyof FeeFormState>(
    field: K,
    value: FeeFormState[K],
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    if (error) {
      setError("");
    }
  };

  const totalFeeRupees = Number(form.totalFee) || 0;

  const discountRupees = Number(form.discount) || 0;

  const effectiveFeeRupees = Math.max(totalFeeRupees - discountRupees, 0);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    if (!isEditing && !form.studentId) {
      setError("Please select a student.");

      return;
    }

    if (!isEditing && !form.courseId) {
      setError("Please select a course.");

      return;
    }

    const totalFee = Number(form.totalFee);

    const discount = Number(form.discount);

    if (!Number.isFinite(totalFee) || totalFee <= 0) {
      setError("Total fee must be greater than zero.");

      return;
    }

    if (!Number.isFinite(discount) || discount < 0) {
      setError("Discount cannot be negative.");

      return;
    }

    if (discount > totalFee) {
      setError("Discount cannot exceed the total fee.");

      return;
    }

    const totalFeePaise = rupeesToPaise(totalFee);

    const discountPaise = rupeesToPaise(discount);

    try {
      if (feePlan) {
        const input: UpdateFeePlanInput = {
          totalFeePaise,
          discountPaise,

          dueDate: form.dueDate || null,

          notes: form.notes.trim() || null,

          status: feePlan.status,
        };

        await onUpdate(feePlan.id, input);

        return;
      }

      const input: CreateFeePlanInput = {
        studentId: form.studentId,

        courseId: form.courseId,

        totalFeePaise,
        discountPaise,

        ...(form.dueDate
          ? {
              dueDate: form.dueDate,
            }
          : {}),

        ...(form.notes.trim()
          ? {
              notes: form.notes.trim(),
            }
          : {}),
      };

      await onCreate(input);
    } catch {
      // API errors are supplied
      // through serverError.
    }
  };

  return (
    <div
      className="fee-modal__backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        className="fee-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fee-modal-title"
      >
        <div className="fee-modal__header">
          <div className="fee-modal__heading">
            <div className="fee-modal__icon">
              <IndianRupee size={20} strokeWidth={1.8} aria-hidden="true" />
            </div>

            <div>
              <span>Fee Management</span>

              <h2 id="fee-modal-title">
                {isEditing ? "Edit Fee Plan" : "Create Fee Plan"}
              </h2>
            </div>
          </div>

          <button
            className="fee-modal__close"
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close fee form"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <form className="fee-modal__form" onSubmit={handleSubmit}>
          <div className="fee-modal__grid">
            <div className="fee-modal__field">
              <label htmlFor="fee-student">
                Student
                <span>*</span>
              </label>

              <select
                id="fee-student"
                value={form.studentId}
                onChange={(event) =>
                  updateField("studentId", event.target.value)
                }
                disabled={isSubmitting || isEditing}
              >
                <option value="">Select student</option>

                {students.map((student) => {
                  const fullName = [student.firstName, student.lastName]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <option key={student.id} value={student.id}>
                      {student.admissionNumber} — {fullName}
                    </option>
                  );
                })}
              </select>

              {isEditing && (
                <small>
                  Student cannot be changed after the fee plan is created.
                </small>
              )}
            </div>

            <div className="fee-modal__field">
              <label htmlFor="fee-course">
                Course
                <span>*</span>
              </label>

              <select
                id="fee-course"
                value={form.courseId}
                onChange={(event) =>
                  updateField("courseId", event.target.value)
                }
                disabled={isSubmitting || isEditing}
              >
                <option value="">Select course</option>

                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>

              {isEditing && (
                <small>
                  Course cannot be changed after the enrollment is created.
                </small>
              )}
            </div>

            <div className="fee-modal__field">
              <label htmlFor="fee-total">
                Total fee
                <span>*</span>
              </label>

              <input
                id="fee-total"
                type="number"
                min="0.01"
                step="0.01"
                value={form.totalFee}
                onChange={(event) =>
                  updateField("totalFee", event.target.value)
                }
                placeholder="0"
                disabled={isSubmitting}
              />

              <small>Enter amount in rupees.</small>
            </div>

            <div className="fee-modal__field">
              <label htmlFor="fee-discount">Discount</label>

              <input
                id="fee-discount"
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(event) =>
                  updateField("discount", event.target.value)
                }
                placeholder="0"
                disabled={isSubmitting}
              />

              <small>Optional discount in rupees.</small>
            </div>

            <div className="fee-modal__summary">
              <div className="fee-modal__summary-item">
                <span>Total fee</span>

                <strong>
                  {formatIndianRupees(
                    rupeesToPaise(Math.max(totalFeeRupees, 0)),
                  )}
                </strong>
              </div>

              <div className="fee-modal__summary-item">
                <span>Discount</span>

                <strong>
                  {formatIndianRupees(
                    rupeesToPaise(Math.max(discountRupees, 0)),
                  )}
                </strong>
              </div>

              <div className="fee-modal__summary-item fee-modal__summary-item--balance">
                <span>Effective fee</span>

                <strong>
                  {formatIndianRupees(rupeesToPaise(effectiveFeeRupees))}
                </strong>
              </div>
            </div>

            <div className="fee-modal__field fee-modal__field--full">
              <label htmlFor="fee-due-date">Due date</label>

              <input
                id="fee-due-date"
                type="date"
                value={form.dueDate}
                onChange={(event) => updateField("dueDate", event.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="fee-modal__field fee-modal__field--full">
              <label htmlFor="fee-notes">Notes</label>

              <textarea
                id="fee-notes"
                rows={4}
                maxLength={1000}
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                placeholder="Optional internal notes"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {(error || serverError) && (
            <div className="fee-modal__error" role="alert">
              {error || serverError}
            </div>
          )}

          <div className="fee-modal__actions">
            <button
              className="fee-modal__cancel"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>

            <button
              className="fee-modal__submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Create Fee Plan"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function FeePlanModal({ open, feePlan, ...props }: FeePlanModalProps) {
  if (!open) {
    return null;
  }

  return (
    <FeePlanForm
      key={feePlan?.id ?? "new-fee-plan"}
      feePlan={feePlan}
      {...props}
    />
  );
}
