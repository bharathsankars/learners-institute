import { z } from "zod";

export const updateInstituteSettingsSchema = z.object({
  instituteName: z
    .string()
    .trim()
    .min(2, "Institute name is required.")
    .max(200),

  phone: z
    .string()
    .trim()
    .max(30),

  whatsapp: z
    .string()
    .trim()
    .max(30),

  email: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        z.string().email().safeParse(value).success,
      "Please enter a valid email address.",
    ),

  address: z
    .string()
    .trim()
    .max(1000),

  mapsUrl: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        z.string().url().safeParse(value).success,
      "Please enter a valid URL.",
    ),
});

export type UpdateInstituteSettingsInput =
  z.infer<typeof updateInstituteSettingsSchema>;
