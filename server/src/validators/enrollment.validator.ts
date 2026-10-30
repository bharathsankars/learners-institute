import { z } from "zod";

export const enrollmentStudentIdSchema = z.string().uuid(
  "Invalid student ID.",
);

export const assignEnrollmentSchema = z.object({
  courseId: z.string().uuid("Invalid course ID."),
}).strict();

export type AssignEnrollmentInput = z.infer<
  typeof assignEnrollmentSchema
>;
