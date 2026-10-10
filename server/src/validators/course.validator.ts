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

export const createCourseSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, "Course title must contain at least 2 characters.")
    .max(150, "Course title must be 150 characters or fewer."),

  slug: z
    .string()
    .trim()
    .min(2, "Course slug is required.")
    .max(150, "Course slug must be 150 characters or fewer.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Slug may contain lowercase letters, numbers, and hyphens only.",
    ),

  shortDescription: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .max(300, "Short description must be 300 characters or fewer.")
      .optional(),
  ),

  description: z.preprocess(
    emptyStringToUndefined,
    z
      .string()
      .max(5000, "Description must be 5000 characters or fewer.")
      .optional(),
  ),

  category: optionalString,

  skills: z.array(z.string().trim().min(1)).default([]),

  isActive: z.boolean().default(true),

  displayOrder: z.number().int().min(0).default(0),
});

export const updateCourseSchema = createCourseSchema;

export const courseIdSchema = z.string().uuid("Invalid course ID.");

export type CreateCourseInput = z.infer<typeof createCourseSchema>;

export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
