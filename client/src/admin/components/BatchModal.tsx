import { type FormEvent, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Clock3, LoaderCircle, X } from "lucide-react";

import {
  fetchBatchInstructors,
  type Batch,
  type BatchInput,
  type Weekday,
} from "../../api/batches";
import { WEEKDAYS, toTimeInput } from "../utils/batches";

import "../styles/AddStudentModal.css";
import "../styles/CourseModal.css";
import "../styles/Batches.css";

type BatchModalProps = {
  open: boolean;
  batch?: Batch | null;
  isSubmitting: boolean;
  serverError?: string;
  onClose: () => void;
  onSave: (input: BatchInput, batchId?: string) => Promise<void>;
};

const dayPresets: { label: string; days: Weekday[] }[] = [
  { label: "Mon–Fri", days: ["MON", "TUE", "WED", "THU", "FRI"] },
  { label: "Mon–Sat", days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"] },
  { label: "Every day", days: WEEKDAYS.map((day) => day.key) },
];

type BatchFormState = {
  name: string;
  days: Weekday[];
  startTime: string;
  endTime: string;
  capacity: string;
  instructorId: string;
  isActive: boolean;
};

function getInitialForm(batch?: Batch | null): BatchFormState {
  if (!batch) {
    return {
      name: "",
      days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      startTime: "",
      endTime: "",
      capacity: "15",
      instructorId: "",
      isActive: true,
    };
  }

  return {
    name: batch.name,
    days: batch.days,
    startTime: toTimeInput(batch.startMinutes),
    endTime: toTimeInput(batch.endMinutes),
    capacity: String(batch.capacity),
    instructorId: batch.instructor?.id ?? "",
    isActive: batch.isActive,
  };
}

type BatchFormProps = Omit<BatchModalProps, "open">;

function BatchForm({
  batch,
  isSubmitting,
  serverError,
  onClose,
  onSave,
}: BatchFormProps) {
  const isEditing = Boolean(batch);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const instructors = useQuery({
    queryKey: ["batch-instructors"],
    queryFn: fetchBatchInstructors,
  });

  const [form, setForm] = useState<BatchFormState>(() => getInitialForm(batch));
  const [error, setError] = useState("");

  const updateField = <K extends keyof BatchFormState>(
    field: K,
    value: BatchFormState[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));

    if (error) {
      setError("");
    }
  };

  const toggleDay = (day: Weekday) => {
    updateField(
      "days",
      form.days.includes(day)
        ? form.days.filter((value) => value !== day)
        : WEEKDAYS.map((value) => value.key).filter(
            (value) => value === day || form.days.includes(value),
          ),
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const name = form.name.trim();
    const capacity = Number(form.capacity);

    if (name.length < 2) {
      setError("Enter a batch name with at least 2 characters.");
      return;
    }

    if (!form.days.length) {
      setError("Choose at least one day.");
      return;
    }

    if (!form.startTime || !form.endTime) {
      setError("Enter both a start and an end time.");
      return;
    }

    if (form.endTime <= form.startTime) {
      setError("The end time must be after the start time.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
      setError("Enter a capacity between 1 and 500 seats.");
      return;
    }

    if (batch && capacity < batch.studentCount) {
      setError(
        `This batch already has ${batch.studentCount} students, so capacity cannot be lower than that.`,
      );
      return;
    }

    try {
      await onSave(
        {
          name,
          days: form.days,
          startTime: form.startTime,
          endTime: form.endTime,
          capacity,
          instructorId: form.instructorId || null,
          isActive: form.isActive,
        },
        batch?.id,
      );
    } catch {
      // The parent mutation supplies serverError to this modal.
    }
  };

  // Keep a removed or deactivated instructor visible while editing.
  const currentInstructor = batch?.instructor;
  const instructorMissing =
    currentInstructor &&
    instructors.data &&
    !instructors.data.some((person) => person.id === currentInstructor.id);

  return (
    <dialog
      ref={dialogRef}
      className="student-modal"
      aria-labelledby="batch-modal-title"
      aria-describedby="batch-modal-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!isSubmitting) onClose();
      }}
    >
      <div className="student-modal__header">
        <div className="student-modal__heading">
          <div className="student-modal__heading-icon">
            <Clock3 size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>

          <div>
            <span className="student-modal__eyebrow">Classes & timings</span>
            <h2 id="batch-modal-title">{isEditing ? "Edit batch" : "Add a batch"}</h2>
            <p id="batch-modal-description">
              {isEditing
                ? "Update the batch timing, seats or instructor."
                : "Set up a class time slot. Students from any course can join it."}
            </p>
          </div>
        </div>

        <button
          className="student-modal__close"
          type="button"
          onClick={onClose}
          aria-label="Close batch form"
          disabled={isSubmitting}
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>

      <form className="student-modal__form" onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <div className="student-modal__body">
          <p className="student-modal__required-note">
            Fields marked <span className="student-modal__required" aria-hidden="true">*</span> are required.
          </p>

          <fieldset className="student-modal__fields" disabled={isSubmitting}>
            <section className="student-modal__section">
              <div className="student-modal__section-heading">
                <span>01</span>
                <div>
                  <h3>Schedule</h3>
                  <p>When this batch meets.</p>
                </div>
              </div>

              <div className="student-modal__grid">
                <div className="student-modal__field student-modal__field--full">
                  <label htmlFor="batch-name">
                    Batch name
                    <span className="student-modal__required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="batch-name"
                    type="text"
                    value={form.name}
                    onChange={(event) => updateField("name", event.target.value)}
                    placeholder="e.g. Morning A"
                    maxLength={60}
                    required
                    autoFocus
                  />
                </div>

                <div className="student-modal__field student-modal__field--full">
                  <span className="batch-form__label" id="batch-days-label">
                    Days
                    <span className="student-modal__required" aria-hidden="true">*</span>
                  </span>

                  <div className="batch-form__days" role="group" aria-labelledby="batch-days-label">
                    {WEEKDAYS.map((day) => (
                      <button
                        key={day.key}
                        type="button"
                        className="batch-form__day"
                        aria-pressed={form.days.includes(day.key)}
                        onClick={() => toggleDay(day.key)}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>

                  <div className="batch-form__presets">
                    {dayPresets.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => updateField("days", preset.days)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="student-modal__field">
                  <label htmlFor="batch-start">
                    Start time
                    <span className="student-modal__required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="batch-start"
                    type="time"
                    value={form.startTime}
                    onChange={(event) => updateField("startTime", event.target.value)}
                    required
                  />
                </div>

                <div className="student-modal__field">
                  <label htmlFor="batch-end">
                    End time
                    <span className="student-modal__required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="batch-end"
                    type="time"
                    value={form.endTime}
                    onChange={(event) => updateField("endTime", event.target.value)}
                    required
                  />
                </div>
              </div>
            </section>

            <section className="student-modal__section">
              <div className="student-modal__section-heading">
                <span>02</span>
                <div>
                  <h3>Seats & instructor</h3>
                  <p>How many students fit and who teaches.</p>
                </div>
              </div>

              <div className="student-modal__grid">
                <div className="student-modal__field">
                  <label htmlFor="batch-capacity">
                    Seat capacity
                    <span className="student-modal__required" aria-hidden="true">*</span>
                  </label>
                  <input
                    id="batch-capacity"
                    type="number"
                    min={Math.max(1, batch?.studentCount ?? 1)}
                    max={500}
                    step={1}
                    value={form.capacity}
                    onChange={(event) => updateField("capacity", event.target.value)}
                    required
                  />
                  <small className="student-modal__field-help">
                    Usually the number of typewriters or seats.
                  </small>
                </div>

                <div className="student-modal__field">
                  <label htmlFor="batch-instructor">Instructor</label>
                  <select
                    id="batch-instructor"
                    value={form.instructorId}
                    onChange={(event) => updateField("instructorId", event.target.value)}
                  >
                    <option value="">No instructor</option>
                    {instructorMissing && (
                      <option value={currentInstructor.id}>
                        {currentInstructor.firstName} {currentInstructor.lastName} (inactive)
                      </option>
                    )}
                    {instructors.data?.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.firstName} {person.lastName}
                      </option>
                    ))}
                  </select>
                  <small className="student-modal__field-help">
                    {instructors.isError
                      ? "Instructors could not be loaded."
                      : "Choose from the people in Settings."}
                  </small>
                </div>

                <div className="student-modal__field student-modal__field--full">
                  <label className="course-form__toggle">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => updateField("isActive", event.target.checked)}
                    />
                    <span>
                      <strong>Active batch</strong>
                      <small className="student-modal__field-help">
                        Uncheck to archive it. Archived batches keep their students but cannot take new ones.
                      </small>
                    </span>
                  </label>
                </div>
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
          <span className="student-modal__save-note">
            <Check size={14} aria-hidden="true" />
            Students from any course can join this batch
          </span>
          <div>
            <button
              className="student-modal__cancel"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button className="student-modal__submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <LoaderCircle className="student-modal__spinner" size={16} aria-hidden="true" />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
              {isSubmitting ? "Saving..." : isEditing ? "Save changes" : "Add batch"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

export function BatchModal({ open, batch, ...props }: BatchModalProps) {
  if (!open) {
    return null;
  }

  return <BatchForm key={batch?.id ?? "new-batch"} batch={batch} {...props} />;
}
