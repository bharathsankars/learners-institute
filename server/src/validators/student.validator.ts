import { z } from "zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}

const optionalString = z.preprocess(
  emptyStringToUndefined,
  z.string().optional(),
);

const optionalEmail = z.preprocess(
  emptyStringToUndefined,
  z.string().email("Please enter a valid email address.").optional(),
);

const optionalDate = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format.")
    .optional(),
);

export const createStudentSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must contain at least 2 characters.")
    .max(100, "First name must be 100 characters or fewer."),

  lastName: optionalString,

  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(20, "Please enter a valid phone number."),

  email: optionalEmail,

  dateOfBirth: optionalDate,

  gender: optionalString,

  address: z.preprocess(
    emptyStringToUndefined,
    z.string().max(500, "Address must be 500 characters or fewer.").optional(),
  ),
});

export const updateStudentSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, "First name must contain at least 2 characters.")
    .max(100, "First name must be 100 characters or fewer."),

  lastName: optionalString,

  phone: z
    .string()
    .trim()
    .min(7, "Please enter a valid phone number.")
    .max(20, "Please enter a valid phone number."),

  email: optionalEmail,

  dateOfBirth: optionalDate,

  gender: optionalString,

  address: z.preprocess(
    emptyStringToUndefined,
    z.string().max(500, "Address must be 500 characters or fewer.").optional(),
  ),

  status: z.enum(["ACTIVE", "INACTIVE", "COMPLETED"]),
});

export const studentIdSchema = z.string().uuid("Invalid student ID.");

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
