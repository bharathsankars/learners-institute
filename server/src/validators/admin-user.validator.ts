import { z } from "zod";

export const adminUserIdSchema = z
  .string()
  .uuid("Invalid user ID.");

const manageableRoleSchema =
  z.enum([
    "ADMIN",
    "STAFF",
  ]);

const usernameSchema = z
  .string()
  .trim()
  .min(
    3,
    "Username must contain at least 3 characters.",
  )
  .max(
    100,
    "Username is too long.",
  )
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username may contain only letters, numbers, dots, underscores, and hyphens.",
  );

const passwordSchema = z
  .string()
  .min(
    8,
    "Password must contain at least 8 characters.",
  )
  .max(
    200,
    "Password is too long.",
  );

export const createAdminUserSchema =
  z.object({
    firstName: z
      .string()
      .trim()
      .min(
        1,
        "First name is required.",
      )
      .max(100),

    lastName: z
      .string()
      .trim()
      .min(
        1,
        "Last name is required.",
      )
      .max(100),

    username:
      usernameSchema,

    email: z
      .string()
      .trim()
      .email(
        "Please enter a valid email address.",
      )
      .max(200),

    password:
      passwordSchema,

    role:
      manageableRoleSchema.default("ADMIN"),
  });

export const updateAdminUserSchema =
  z
    .object({
      firstName: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

      lastName: z
        .string()
        .trim()
        .min(1)
        .max(100)
        .optional(),

      username:
        usernameSchema.optional(),

      email: z
        .string()
        .trim()
        .email(
          "Please enter a valid email address.",
        )
        .max(200)
        .optional(),

      password:
        passwordSchema.optional(),

      role:
        manageableRoleSchema.optional(),

      isActive:
        z.boolean().optional(),
    })
    .refine(
      (value) =>
        Object.keys(value)
          .length > 0,
      {
        message:
          "At least one field must be updated.",
      },
    );

export type CreateAdminUserInput =
  z.infer<
    typeof createAdminUserSchema
  >;

export type UpdateAdminUserInput =
  z.infer<
    typeof updateAdminUserSchema
  >;
