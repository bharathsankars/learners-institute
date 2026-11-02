import { z } from "zod";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date like 2026-11-02.");

export const attendanceSheetQuerySchema = z.object({
  batchId: z.string().uuid("Invalid batch ID."),
  date: dateSchema,
});

export const attendanceSaveSchema = z
  .object({
    batchId: z.string().uuid("Invalid batch ID."),
    date: dateSchema,
    records: z
      .array(
        z.object({
          studentId: z.string().uuid("Invalid student ID."),
          status: z.enum(["PRESENT", "ABSENT"]),
        }),
      )
      .min(1, "There are no students to mark.")
      .max(500),
  })
  .refine((input) => new Set(input.records.map((record) => record.studentId)).size === input.records.length, {
    message: "Each student can only be marked once.",
    path: ["records"],
  });

export const attendanceMonthQuerySchema = z.object({
  batchId: z.string().uuid("Invalid batch ID."),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use a month like 2026-11."),
});

export type AttendanceSaveInput = z.infer<typeof attendanceSaveSchema>;
