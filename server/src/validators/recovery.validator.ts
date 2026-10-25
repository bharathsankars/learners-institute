import { z } from "zod";

const temporaryPasswordSchema =
  z
    .string()
    .min(
      8,
      "Temporary recovery password must contain at least 8 characters.",
    )
    .max(
      200,
      "Temporary recovery password is too long.",
    );

const newPasswordSchema =
  z
    .string()
    .min(
      8,
      "New password must contain at least 8 characters.",
    )
    .max(
      200,
      "New password is too long.",
    );

export const verifyTemporaryRecoveryPasswordSchema =
  z.object({
    temporaryPassword:
      temporaryPasswordSchema,
  });

export const completeSuperAdminPasswordResetSchema =
  z
    .object({
      temporaryPassword:
        temporaryPasswordSchema,

      newPassword:
        newPasswordSchema,
    })
    .refine(
      (value) =>
        value.temporaryPassword !==
        value.newPassword,
      {
        message:
          "Your new password must be different from the temporary recovery password.",
        path: ["newPassword"],
      },
    );

export type VerifyTemporaryRecoveryPasswordInput =
  z.infer<
    typeof verifyTemporaryRecoveryPasswordSchema
  >;

export type CompleteSuperAdminPasswordResetInput =
  z.infer<
    typeof completeSuperAdminPasswordResetSchema
  >;
