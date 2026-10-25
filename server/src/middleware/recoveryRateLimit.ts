import { rateLimit } from "express-rate-limit";

export const recoveryRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many recovery attempts. Please try again later.",
  },
});
