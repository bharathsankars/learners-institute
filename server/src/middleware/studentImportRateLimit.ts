import type { Request, Response } from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";

// Import routes run after requireAuthenticated, so limit per signed-in user:
// signing in again cannot reset the budget, and staff behind one shared
// network address do not exhaust each other's.
const keyGenerator = (req: Request, res: Response) =>
  typeof res.locals.userId === "string"
    ? `user:${res.locals.userId}`
    : ipKeyGenerator(req.ip ?? "");

export const studentImportPreviewRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator,
  message: {
    success: false,
    message: "Too many import validations. Please wait a few minutes and try again.",
  },
});

export const studentImportConfirmRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator,
  message: {
    success: false,
    message: "Too many import confirmations. Please wait a few minutes and try again.",
  },
});
