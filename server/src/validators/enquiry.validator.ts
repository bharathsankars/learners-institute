import { z } from "zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}

const optionalEmail = z.preprocess(
  emptyStringToUndefined,
  z.string().email("Please enter a valid email address.").optional(),
);

export const createEnquirySchema = z.object({
  requestId: z.string().uuid(),
  name: z.string().trim().min(2, "Please enter your name.").max(100),
  phone: z
    .string()
    .trim()
    .min(7)
    .max(20)
    .regex(/^[+\d\s().-]+$/, "Please enter a valid phone number.")
    .refine(
      (value) => value.replace(/\D/g, "").length >= 7,
      "Please enter a valid phone number.",
    ),
  email: optionalEmail,
  course: z.string().trim().min(1, "Please select a course.").max(200),
  message: z.string().trim().max(500).optional(),
});
export const updateEnquirySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]),
});
export const enquiryIdSchema = z.string().uuid();
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
