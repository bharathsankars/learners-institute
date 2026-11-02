import { z } from "zod";

export const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

// "07:30" -> 450 minutes after midnight.
const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 07:30.")
  .transform((value) => Number(value.slice(0, 2)) * 60 + Number(value.slice(3, 5)));

export const batchInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Batch name must contain at least 2 characters.")
      .max(60, "Batch name must be 60 characters or fewer."),

    days: z
      .array(z.enum(WEEKDAYS))
      .min(1, "Choose at least one day.")
      .transform((days) =>
        WEEKDAYS.filter((day) => days.includes(day)),
      ),

    startTime: timeSchema,
    endTime: timeSchema,

    capacity: z
      .number()
      .int("Capacity must be a whole number.")
      .min(1, "Capacity must be at least 1.")
      .max(500, "Capacity must be 500 or fewer."),

    instructorId: z
      .string()
      .uuid("Invalid instructor.")
      .nullable()
      .default(null),

    isActive: z.boolean().default(true),
  })
  .refine((input) => input.endTime > input.startTime, {
    message: "End time must be after the start time.",
    path: ["endTime"],
  });

export const batchIdSchema = z.string().uuid("Invalid batch ID.");

export const batchStudentSchema = z.object({
  studentId: z.string().uuid("Invalid student ID."),
});

export type BatchInput = z.infer<typeof batchInputSchema>;
