-- Only one ACTIVE enrollment per student/course.
-- Historical COMPLETED and CANCELLED records remain permitted.
CREATE UNIQUE INDEX "enrollments_unique_active_student_course"
ON "enrollments" ("studentId", "courseId")
WHERE "status" = 'ACTIVE';
