import { z } from "zod";

import { createStudentSchema } from "./student.validator.js";

const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
    .optional(),
);

const admissionFeeSchema = z
  .object({
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
  })
  .refine((fee) => fee.discountPaise <= fee.totalFeePaise, {
    message: "Discount cannot exceed the total fee.",
    path: ["discountPaise"],
  });

// One admission: the student, their course(s), an optional batch place and
// optional fee plans (one per course), saved together.
export const admissionSchema = z
  .object({
    student: createStudentSchema,

    enquiryId: z.string().uuid("Invalid enquiry ID.").nullable().default(null),

    courseIds: z
      .array(z.string().uuid("Invalid course ID."))
      .min(1, "Choose at least one course.")
      .max(5, "Choose up to 5 courses."),

    batchId: z.string().uuid("Invalid batch ID.").nullable().default(null),

    fees: z.array(admissionFeeSchema).default([]),
  })
  .refine((input) => new Set(input.courseIds).size === input.courseIds.length, {
    message: "Each course can only be chosen once.",
    path: ["courseIds"],
  })
  .refine(
    (input) =>
      new Set(input.fees.map((fee) => fee.courseId)).size === input.fees.length &&
      input.fees.every((fee) => input.courseIds.includes(fee.courseId)),
    {
      message: "Each fee must belong to one of the chosen courses.",
      path: ["fees"],
    },
  );

export type AdmissionInput = z.infer<typeof admissionSchema>;
