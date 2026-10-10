import { endSession } from "../middleware/session.js";
import { Router } from "express";

import { loginController } from "../controllers/auth.controller.js";

export const authRouter = Router();

authRouter.post("/login", loginController);

authRouter.post("/logout", async (req, res, next) => {
  try { await endSession(req, res); res.sendStatus(204); } catch (error) { next(error); }
});
