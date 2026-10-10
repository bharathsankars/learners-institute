import type { Request, Response } from "express";
import { ZodError } from "zod";

import { startSession } from "../middleware/session.js";
import { authenticateUser } from "../services/auth.service.js";
import { loginSchema } from "../validators/auth.validator.js";

export async function loginController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);

    const user = await authenticateUser(input);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid username or password.",
      });

      return;
    }

    await startSession(user.id, res);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        user,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid login data.",
        errors: error.flatten().fieldErrors,
      });

      return;
    }

    console.error("Login failed:", error);

    res.status(500).json({
      success: false,
      message: "Unable to sign in.",
    });
  }
}
