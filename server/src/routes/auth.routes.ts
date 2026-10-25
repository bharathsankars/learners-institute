import { Router } from "express";

import { loginController } from "../controllers/auth.controller.js";
import {
  endSession,
  getSessionUser,
} from "../middleware/session.js";

export const authRouter = Router();

authRouter.post("/login", loginController);

authRouter.get("/me", async (req, res, next) => {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Please sign in again.",
      });

      return;
    }

    // Recovery Admin must never be treated as a normal admin.
    if (user.role === "RECOVERY_ADMIN") {
      res.status(403).json({
        success: false,
        message: "Recovery accounts cannot access the administration portal.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    await endSession(req, res);
    res.sendStatus(204);
  } catch (error) {
    next(error);
  }
});
