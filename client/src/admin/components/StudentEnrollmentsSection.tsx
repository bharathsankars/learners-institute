import { useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchCourses } from "../../api/courses";
import {
  assignStudentCourse,
  fetchStudentEnrollments,
  type StudentEnrollment,
} from "../../api/enrollments";

type Props = {
  studentId: string;
  canAssign?: boolean;
};

const enrollmentStatusLabels: Record<StudentEnrollment["status"], string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function StudentEnrollmentsSection({ studentId, canAssign = true }: Props) {
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState("");
  const [showAssignment, setShowAssignment] = useState(false);
  const [notice, setNotice] = useState("");

  const enrollmentsQuery = useQuery({
    queryKey: ["student-enrollments", studentId],
    queryFn: () => fetchStudentEnrollments(studentId),
  });

  const coursesQuery = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    enabled: showAssignment,
  });

  const assignment = useMutation({
    mutationFn: (selectedCourseId: string) =>
      assignStudentCourse(studentId, selectedCourseId),
    onSuccess: async () => {
      setCourseId("");
      setShowAssignment(false);
      setNotice("Course assigned successfully.");

      await queryClient.invalidateQueries({
        queryKey: ["student-enrollments", studentId],
      });
    },
  });

  const enrollments = enrollmentsQuery.data ?? [];

  const activeCourseIds = new Set(
    enrollments
      .filter((enrollment) => enrollment.status === "ACTIVE")
      .map((enrollment) => enrollment.course.id),
  );

  const availableCourses = (coursesQuery.data ?? [])
    .filter((course) => course.isActive && !activeCourseIds.has(course.id))
    .sort((a, b) => a.title.localeCompare(b.title));

  return (
    <section
      className="student-profile__section"
      aria-labelledby="student-profile-courses"
    >
      <div className="student-profile__section-heading">
        <span className="student-profile__section-icon">
          <BookOpen size={19} aria-hidden="true" />
        </span>

        <div>
          <h3 id="student-profile-courses">Enrolled courses</h3>
          <p>Courses assigned to this student.</p>
        </div>
      </div>

      {enrollmentsQuery.isPending ? (
        <p role="status">Loading enrolled courses…</p>
      ) : enrollmentsQuery.isError ? (
        <div role="alert">
          <p>{enrollmentsQuery.error.message}</p>
          <button
            type="button"
            className="student-profile__button"
            onClick={() => void enrollmentsQuery.refetch()}
          >
            Retry
          </button>
        </div>
      ) : enrollments.length === 0 ? (
        <p>No courses have been assigned yet.</p>
      ) : (
        <ul className="student-profile__enrollment-list">
          {enrollments.map((enrollment) => (
            <li
              className="student-profile__enrollment-item"
              key={enrollment.id}
            >
              <strong>{enrollment.course.title}</strong>
              <span
                className={`student-profile__enrollment-status student-profile__enrollment-status--${enrollment.status.toLowerCase()}`}
              >
                {enrollmentStatusLabels[enrollment.status]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {notice && (
        <p role="status" className="student-profile__enrollment-success">
          {notice}
        </p>
      )}

      {!canAssign ? null : !showAssignment ? (
        <button
          type="button"
          className="student-profile__button"
          disabled={enrollmentsQuery.isPending || enrollmentsQuery.isError}
          onClick={() => {
            setNotice("");
            assignment.reset();
            setShowAssignment(true);
          }}
        >
          <Plus size={17} aria-hidden="true" />
          Assign course
        </button>
      ) : (
        <form
          className="student-profile__enrollment-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!courseId || assignment.isPending) return;
            setNotice("");
            assignment.mutate(courseId);
          }}
        >
          <label htmlFor="student-enrollment-course">
            Select a course
          </label>

          <select
            id="student-enrollment-course"
            value={courseId}
            disabled={coursesQuery.isPending || assignment.isPending}
            onChange={(event) => setCourseId(event.target.value)}
            required
          >
            <option value="">Choose an active course</option>
            {availableCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>

          {coursesQuery.isPending && (
            <p role="status">Loading available courses…</p>
          )}

          {coursesQuery.isError && (
            <p role="alert">{coursesQuery.error.message}</p>
          )}

          {coursesQuery.isSuccess && availableCourses.length === 0 && (
            <p>No additional active courses are available.</p>
          )}

          {assignment.isError && (
            <p role="alert">{assignment.error.message}</p>
          )}

          <div className="student-profile__enrollment-actions">
            <button
              type="submit"
              className="student-profile__button student-profile__button--primary"
              disabled={
                !courseId ||
                assignment.isPending ||
                !availableCourses.some((course) => course.id === courseId)
              }
            >
              {assignment.isPending ? "Assigning…" : "Save assignment"}
            </button>

            <button
              type="button"
              className="student-profile__button"
              disabled={assignment.isPending}
              onClick={() => {
                setShowAssignment(false);
                setCourseId("");
                assignment.reset();
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
