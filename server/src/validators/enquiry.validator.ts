import { z } from "zod";

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? undefined : trimmedValue;
}

const phoneMessage = "Please enter a valid 10-digit mobile number.";

// Indian numbers (optionally prefixed with +91, 91 or 0) must be a
// 10-digit mobile number. Numbers with another country code are accepted
// at international length. Mirrors the public enquiry form.
function isValidPhone(value: string): boolean {
  if (!/^\+?[\d\s().-]+$/.test(value.trim())) return false;

  const digits = value.replace(/\D/g, "");

  if (value.trim().startsWith("+") && !digits.startsWith("91")) {
    return /^[1-9]\d{7,14}$/.test(digits);
  }

  return /^[6-9]\d{9}$/.test(digits.replace(/^(91|0)(?=\d{10}$)/, ""));
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
    .max(20, phoneMessage)
    .regex(/^[+\d\s().-]+$/, phoneMessage)
    .refine(isValidPhone, phoneMessage),
  email: optionalEmail,
  course: z.string().trim().min(1, "Please select a course.").max(1000),
  message: z.string().trim().max(500).optional(),
});
export const updateEnquirySchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "CLOSED"]),
});
export const enquiryIdSchema = z.string().uuid();
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
