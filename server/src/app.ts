import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";

import { enquiryRouter } from "./routes/enquiry.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { requireSuperAdmin } from "./middleware/session.js";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminUserRouter } from "./routes/admin-user.routes.js";
import { courseRouter } from "./routes/course.routes.js";
import { feeRouter } from "./routes/fee.routes.js";
import { studentRouter } from "./routes/student.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";

export const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
  }),
);

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  }),
);

app.use(cookieParser());

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Learners Institute API is running",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/admin-users", adminUserRouter);
app.use("/api/students", studentRouter);
app.use("/api/courses", courseRouter);
app.use("/api/fees", requireSuperAdmin, feeRouter);
app.use("/api/payments", requireSuperAdmin, paymentRouter);
app.use("/api/settings", requireSuperAdmin, settingsRouter);

app.use("/api/enquiries", enquiryRouter);

export default app;
