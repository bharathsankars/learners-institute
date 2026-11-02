import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { fetchBatches } from "../../api/batches";
import { fetchCourses } from "../../api/courses";
import { batchSeatState, formatBatchDays, formatBatchTiming } from "../utils/batches";

import type { FeeDraft, PlacementValue } from "../utils/admissions";

import "../styles/Admissions.css";

type Props = {
  value: PlacementValue;
  onChange: (value: PlacementValue) => void;
  canSetFees: boolean;
  suggestedCourseNames?: string[];
  error?: string;
};

// Step 3 of a new admission: course(s), an optional batch and, for a Super
// Admin, the fee for each course.
export function AdmissionPlacementFields({ value, onChange, canSetFees, suggestedCourseNames, error }: Props) {
  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });
  const batches = useQuery({ queryKey: ["batches"], queryFn: fetchBatches });

  const activeCourses = (courses.data ?? []).filter((course) => course.isActive);
  const activeBatches = (batches.data ?? []).filter((batch) => batch.isActive);

  // Pre-select courses whose titles match the suggestion, once, after courses load.
  const suggestionApplied = useRef(false);

  useEffect(() => {
    if (suggestionApplied.current || !courses.data || !suggestedCourseNames?.length) {
      return;
    }

    suggestionApplied.current = true;

    const wanted = suggestedCourseNames.map((name) => name.trim().toLowerCase());
    const matched = courses.data
      .filter((course) => course.isActive && wanted.includes(course.title.trim().toLowerCase()))
      .map((course) => course.id);

    if (matched.length && !value.courseIds.length) {
      onChange({ ...value, courseIds: matched });
    }
  }, [courses.data, suggestedCourseNames, value, onChange]);

  const toggleCourse = (courseId: string) => {
    const selected = value.courseIds.includes(courseId);

    onChange({
      ...value,
      courseIds: selected
        ? value.courseIds.filter((id) => id !== courseId)
        : [...value.courseIds, courseId],
    });
  };

  const updateFee = (courseId: string, field: keyof FeeDraft, next: string) => {
    const current = value.fees[courseId] ?? { total: "", discount: "", dueDate: "" };

    onChange({ ...value, fees: { ...value.fees, [courseId]: { ...current, [field]: next } } });
  };

  return (
    <section className="student-modal__section" aria-labelledby="admission-placement-heading">
      <div className="student-modal__section-heading">
        <span className="student-modal__section-number">3</span>
        <div>
          <h3 id="admission-placement-heading">Course &amp; batch</h3>
          <p>What the student is joining and when they will attend.</p>
        </div>
      </div>

      <div className="student-modal__grid">
        <div className="student-modal__field student-modal__field--full">
          <span className="admission-placement__label" id="admission-courses-label">
            Courses
            <span className="student-modal__required" aria-hidden="true">*</span>
          </span>

          {courses.isPending ? (
            <small className="student-modal__field-help">Loading courses…</small>
          ) : courses.isError ? (
            <small className="student-modal__field-help">Courses could not be loaded.</small>
          ) : !activeCourses.length ? (
            <small className="student-modal__field-help">Add an active course first.</small>
          ) : (
            <div className="admission-placement__courses" role="group" aria-labelledby="admission-courses-label">
              {activeCourses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  className="admission-placement__course"
                  aria-pressed={value.courseIds.includes(course.id)}
                  onClick={() => toggleCourse(course.id)}
                >
                  {course.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="student-modal__field student-modal__field--full">
          <label htmlFor="admission-batch">Batch</label>
          <select
            id="admission-batch"
            value={value.batchId}
            onChange={(event) => onChange({ ...value, batchId: event.target.value })}
          >
            <option value="">No batch yet</option>
            {activeBatches.map((batch) => {
              const full = batchSeatState(batch) === "full";
              const left = batch.capacity - batch.studentCount;

              return (
                <option key={batch.id} value={batch.id} disabled={full}>
                  {batch.name} · {formatBatchTiming(batch)} · {formatBatchDays(batch.days)} ·{" "}
                  {full ? "Full" : `${left} ${left === 1 ? "seat" : "seats"} left`}
                </option>
              );
            })}
          </select>
          <small className="student-modal__field-help">
            Students from any course can share a batch. You can also choose one later.
          </small>
        </div>

        {canSetFees && value.courseIds.length > 0 && (
          <div className="student-modal__field student-modal__field--full">
            <span className="admission-placement__label">Fees</span>
            <small className="student-modal__field-help">
              Optional. Leave a total empty to set the fee later on the Fees page.
            </small>

            <div className="admission-placement__fees">
              {value.courseIds.map((courseId) => {
                const course = activeCourses.find((item) => item.id === courseId);
                const fee = value.fees[courseId] ?? { total: "", discount: "", dueDate: "" };

                return (
                  <fieldset key={courseId} className="admission-placement__fee">
                    <legend>{course?.title ?? "Course"}</legend>
                    <label>
                      <span>Total fee (₹)</span>
                      <input
                        type="number"
                        min={1}
                        step={1}
                        inputMode="numeric"
                        value={fee.total}
                        placeholder="e.g. 4500"
                        onChange={(event) => updateFee(courseId, "total", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Discount (₹)</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        inputMode="numeric"
                        value={fee.discount}
                        placeholder="0"
                        onChange={(event) => updateFee(courseId, "discount", event.target.value)}
                      />
                    </label>
                    <label>
                      <span>Due date</span>
                      <input
                        type="date"
                        value={fee.dueDate}
                        onChange={(event) => updateFee(courseId, "dueDate", event.target.value)}
                      />
                    </label>
                  </fieldset>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="admission-placement__error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
