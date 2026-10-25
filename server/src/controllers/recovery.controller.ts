import type {
  Request,
  Response,
} from "express";

import {
  ZodError,
} from "zod";

import {
  getSessionUser,
  startSession,
} from "../middleware/session.js";

import {
  authenticateUser,
} from "../services/auth.service.js";

import {
  completeSuperAdminPasswordReset,
  createTemporaryRecoveryPassword,
  getRecoverySuperAdmin,
  verifyTemporaryRecoveryPassword,
} from "../services/recovery.service.js";

import {
  loginSchema,
} from "../validators/auth.validator.js";

import {
  completeSuperAdminPasswordResetSchema,
  createTemporaryRecoveryPasswordSchema,
  verifyTemporaryRecoveryPasswordSchema,
} from "../validators/recovery.validator.js";

function zodError(
  error: ZodError,
  res: Response,
) {
  res.status(400).json({
    success: false,

    message:
      error.issues[0]?.message ||
      "Invalid recovery information.",
  });
}

export async function recoveryLoginController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input =
      loginSchema.parse(
        req.body,
      );

    const user =
      await authenticateUser(
        input,
      );

    if (
      !user ||
      user.role !==
        "RECOVERY_ADMIN"
    ) {
      res.status(401).json({
        success: false,

        message:
          "Invalid recovery username or password.",
      });

      return;
    }

    await startSession(
      user.id,
      res,
    );

    res.status(200).json({
      success: true,

      message:
        "Recovery login successful.",
    });
  } catch (error) {
    if (
      error instanceof ZodError
    ) {
      zodError(
        error,
        res,
      );

      return;
    }

    console.error(
      "Recovery login failed:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to sign in to recovery.",
    });
  }
}

export async function getRecoverySuperAdminController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const user =
      await getRecoverySuperAdmin();

    if (!user) {
      res.status(404).json({
        success: false,

        message:
          "Super Admin account not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,

      data: {
        user,
      },
    });
  } catch (error) {
    console.error(
      "Failed to retrieve Super Admin:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to retrieve Super Admin account.",
    });
  }
}

export async function createTemporaryRecoveryPasswordController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const recoveryAdmin =
      await getSessionUser(
        req,
      );

    if (
      !recoveryAdmin ||
      recoveryAdmin.role !==
        "RECOVERY_ADMIN"
    ) {
      res.status(403).json({
        success: false,

        message:
          "Recovery Administrator access is required.",
      });

      return;
    }

    const input =
      createTemporaryRecoveryPasswordSchema.parse(
        req.body,
      );

    const result =
      await createTemporaryRecoveryPassword(
        recoveryAdmin.id,
        input,
      );

    if (
      result.status ===
      "NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,

        message:
          "Super Admin account not found.",
      });

      return;
    }

    res.status(201).json({
      success: true,

      message:
        "Temporary recovery password created.",

      data: {
        expiresAt:
          result.recoveryCode.expiresAt,
      },
    });
  } catch (error) {
    if (
      error instanceof ZodError
    ) {
      zodError(
        error,
        res,
      );

      return;
    }

    console.error(
      "Failed to create recovery password:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to create temporary recovery password.",
    });
  }
}

export async function verifyTemporaryRecoveryPasswordController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input =
      verifyTemporaryRecoveryPasswordSchema.parse(
        req.body,
      );

    const result =
      await verifyTemporaryRecoveryPassword(
        input,
      );

    if (
      result.status ===
      "INVALID"
    ) {
      res.status(401).json({
        success: false,

        message:
          "The temporary recovery password is invalid or has expired.",
      });

      return;
    }

    res.status(200).json({
      success: true,

      message:
        "Temporary recovery password verified.",

      data: {
        expiresAt:
          result.expiresAt,
      },
    });
  } catch (error) {
    if (
      error instanceof ZodError
    ) {
      zodError(
        error,
        res,
      );

      return;
    }

    console.error(
      "Failed to verify recovery password:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to verify recovery password.",
    });
  }
}

export async function completeSuperAdminPasswordResetController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input =
      completeSuperAdminPasswordResetSchema.parse(
        req.body,
      );

    const result =
      await completeSuperAdminPasswordReset(
        input,
      );

    if (
      result.status ===
      "INVALID"
    ) {
      res.status(401).json({
        success: false,

        message:
          "The temporary recovery password is invalid or has expired.",
      });

      return;
    }

    res.status(200).json({
      success: true,

      message:
        "Super Admin password changed successfully.",
    });
  } catch (error) {
    if (
      error instanceof ZodError
    ) {
      zodError(
        error,
        res,
      );

      return;
    }

    console.error(
      "Failed to complete Super Admin password reset:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to change Super Admin password.",
    });
  }
}
