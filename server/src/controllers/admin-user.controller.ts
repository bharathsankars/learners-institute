import type {
  Request,
  Response,
} from "express";

import { ZodError } from "zod";

import {
  createAdminUser,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUser,
} from "../services/admin-user.service.js";

import {
  adminUserIdSchema,
  createAdminUserSchema,
  updateAdminUserSchema,
} from "../validators/admin-user.validator.js";

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
