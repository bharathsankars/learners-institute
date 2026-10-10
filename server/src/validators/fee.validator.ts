import { z } from "zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}

const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
    .optional(),
);

const optionalNotes = z.preprocess(
  emptyStringToUndefined,
  z.string().max(1000, "Notes must be 1000 characters or fewer.").optional(),
);

export const createFeePlanSchema = z
  .object({
    studentId: z.string().uuid("Invalid student ID."),

    courseId: z.string().uuid("Invalid course ID."),

    totalFeePaise: z
      .number()
      .int()
      .positive("Total fee must be greater than zero."),

    discountPaise: z
      .number()
      .int()
      .min(0, "Discount cannot be negative.")
      .default(0),

    dueDate: optionalDate,

    notes: optionalNotes,
  })
  .refine((data) => data.discountPaise <= data.totalFeePaise, {
    message: "Discount cannot exceed the total fee.",
    path: ["discountPaise"],
  });

export const updateFeePlanSchema = z
  .object({
    totalFeePaise: z
      .number()
      .int()
      .positive("Total fee must be greater than zero."),

    discountPaise: z.number().int().min(0, "Discount cannot be negative."),

    dueDate: z
      .union([
        z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format."),
        z.null(),
      ])
      .optional(),

    notes: z
      .union([
        z.string().max(1000, "Notes must be 1000 characters or fewer."),
        z.null(),
      ])
      .optional(),

    status: z.enum(["ACTIVE", "CANCELLED"]),
  })
  .refine((data) => data.discountPaise <= data.totalFeePaise, {
    message: "Discount cannot exceed the total fee.",
    path: ["discountPaise"],
  });

export const feePlanIdSchema = z.string().uuid("Invalid fee plan ID.");

export type CreateFeePlanInput = z.infer<typeof createFeePlanSchema>;

export type UpdateFeePlanInput = z.infer<typeof updateFeePlanSchema>;
