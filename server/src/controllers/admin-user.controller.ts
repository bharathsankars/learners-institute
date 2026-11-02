import type {
  Request,
  Response,
} from "express";

import { ZodError } from "zod";

import {
  changeOwnPassword,
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  resetAdminUserPassword,
  signOutAdminUser,
  updateAdminUser,
} from "../services/admin-user.service.js";
import { logActivity } from "../services/activity.service.js";

import {
  adminUserIdSchema,
  changeOwnPasswordSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
} from "../validators/admin-user.validator.js";

import {
  currentSessionHash,
  getSessionUser,
} from "../middleware/session.js";

function isPrismaError(
  error: unknown,
  code: string,
): error is {
  code: string;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as {
      code?: unknown;
    }).code === code
  );
}

function validationError(
  error: ZodError,
  res: Response,
) {
  const firstIssue =
    error.issues[0];

  const message =
    firstIssue?.message ||
    "Invalid administrator details.";

  res.status(400).json({
    success: false,
    message,
    errors:
      error.flatten().fieldErrors,
  });
}

export async function getAdminUsersController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const users =
      await getAdminUsers();

    res.status(200).json({
      success: true,

      data: {
        users,
      },
    });
  } catch (error) {
    console.error(
      "Failed to retrieve administrators:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to retrieve administrators.",
    });
  }
}

export async function createAdminUserController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input =
      createAdminUserSchema.parse(
        req.body,
      );

    const user =
      await createAdminUser(input);

    await logActivity(res, () => ({
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      summary: `Added ${user.firstName} ${user.lastName} as ${user.role === "ADMIN" ? "Administrator" : "Lecturer"}`,
    }));

    res.status(201).json({
      success: true,

      message:
        "Administrator created successfully.",

      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(
        error,
        res,
      );

      return;
    }

    if (
      isPrismaError(
        error,
        "P2002",
      )
    ) {
      res.status(409).json({
        success: false,

        message:
          "That username or email address is already in use.",
      });

      return;
    }

    console.error(
      "Failed to create administrator:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to create administrator.",
    });
  }
}

export async function updateAdminUserController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId =
      adminUserIdSchema.parse(
        req.params.id,
      );

    const input =
      updateAdminUserSchema.parse(
        req.body,
      );

    const result =
      await updateAdminUser(
        userId,
        input,
      );

    if (
      result.status ===
      "NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,
        message:
          "Administrator not found.",
      });

      return;
    }

    if (
      result.status ===
      "PROTECTED"
    ) {
      res.status(403).json({
        success: false,

        message:
          "The Super Admin account is protected and cannot be modified here.",
      });

      return;
    }

    await logActivity(res, () => ({
      action: input.isActive === false ? "user.deactivated" : input.isActive === true ? "user.reactivated" : "user.updated",
      entityType: "user",
      entityId: userId,
      summary: `${input.isActive === false ? "Deactivated" : input.isActive === true ? "Reactivated" : "Updated"} ${result.user.firstName} ${result.user.lastName}${input.password ? " (password changed)" : ""}`,
    }));

    res.status(200).json({
      success: true,

      message:
        "Administrator updated successfully.",

      data: {
        user: result.user,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(
        error,
        res,
      );

      return;
    }

    if (
      isPrismaError(
        error,
        "P2002",
      )
    ) {
      res.status(409).json({
        success: false,

        message:
          "That username or email address is already in use.",
      });

      return;
    }

    console.error(
      "Failed to update administrator:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to update administrator.",
    });
  }
}

export async function changeOwnPasswordController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input =
      changeOwnPasswordSchema.parse(
        req.body,
      );

    const sessionUser =
      await getSessionUser(req);

    if (!sessionUser) {
      res.status(401).json({
        success: false,
        message:
          "Please sign in again.",
      });

      return;
    }

    if (
      sessionUser.role !==
      "SUPER_ADMIN"
    ) {
      res.status(403).json({
        success: false,
        message:
          "Super Admin access is required.",
      });

      return;
    }

    const result =
      await changeOwnPassword(
        sessionUser.id,
        input,
      );

    if (
      result.status ===
      "INVALID_PASSWORD"
    ) {
      res.status(400).json({
        success: false,
        message:
          "The current password is incorrect.",
      });

      return;
    }

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

    if (
      result.status ===
      "FORBIDDEN"
    ) {
      res.status(403).json({
        success: false,
        message:
          "Super Admin access is required.",
      });

      return;
    }

    await logActivity(res, () => ({
      action: "user.password_changed",
      entityType: "user",
      entityId: res.locals.userId ?? null,
      summary: "Changed their own password",
    }));

    res.status(200).json({
      success: true,
      message:
        "Password changed successfully. Please sign in again.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(
        error,
        res,
      );

      return;
    }

    console.error(
      "Failed to change Super Admin password:",
      error,
    );

    res.status(500).json({
      success: false,
      message:
        "Unable to change password.",
    });
  }
}


export async function deleteAdminUserController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId =
      adminUserIdSchema.parse(
        req.params.id,
      );

    const result =
      await deleteAdminUser(
        userId,
      );

    if (
      result.status ===
      "NOT_FOUND"
    ) {
      res.status(404).json({
        success: false,

        message:
          "Administrator not found.",
      });

      return;
    }

    if (
      result.status ===
      "PROTECTED"
    ) {
      res.status(403).json({
        success: false,

        message:
          "The Super Admin account is protected and cannot be deleted.",
      });

      return;
    }

    await logActivity(res, () => ({
      action: "user.deleted",
      entityType: "user",
      entityId: userId,
      summary: `Removed ${result.user.firstName} ${result.user.lastName}`,
    }));

    res.status(200).json({
      success: true,

      message:
        "Administrator deleted successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,

        message:
          "Invalid administrator ID.",
      });

      return;
    }

    console.error(
      "Failed to delete administrator:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to delete administrator.",
    });
  }
}


export async function resetAdminUserPasswordController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = adminUserIdSchema.parse(req.params.id);
    const result = await resetAdminUserPassword(userId);

    if (result.status === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "Administrator not found." });
      return;
    }

    if (result.status === "PROTECTED") {
      res.status(403).json({
        success: false,
        message: "The Super Admin changes their own password from Change password.",
      });
      return;
    }

    await logActivity(res, () => ({
      action: "user.password_reset",
      entityType: "user",
      entityId: userId,
      summary: `Reset the password for ${result.user.firstName} ${result.user.lastName}`,
    }));

    res.status(200).json({
      success: true,
      message: "Temporary password created. They have been signed out everywhere.",
      data: { user: result.user, temporaryPassword: result.temporaryPassword },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(error, res);
      return;
    }

    console.error("Failed to reset administrator password:", error);
    res.status(500).json({ success: false, message: "Unable to reset the password." });
  }
}

export async function signOutAdminUserController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const userId = adminUserIdSchema.parse(req.params.id);
    const isSelf = userId === res.locals.userId;
    // Signing yourself out keeps the session you are using right now.
    const result = await signOutAdminUser(userId, isSelf ? currentSessionHash(req) : null);

    if (result.status === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "Administrator not found." });
      return;
    }

    await logActivity(res, () => ({
      action: "user.signed_out",
      entityType: "user",
      entityId: userId,
      summary: isSelf
        ? "Signed out their other devices"
        : `Signed ${result.user.firstName} ${result.user.lastName} out everywhere`,
    }));

    res.status(200).json({
      success: true,
      message: isSelf
        ? `Signed out ${result.count} other ${result.count === 1 ? "device" : "devices"}.`
        : `${result.user.firstName} has been signed out everywhere.`,
      data: { count: result.count },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      validationError(error, res);
      return;
    }

    console.error("Failed to sign out administrator:", error);
    res.status(500).json({ success: false, message: "Unable to sign out." });
  }
}
