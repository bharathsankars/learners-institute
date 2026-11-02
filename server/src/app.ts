import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import * as helmetModule from "helmet";

import { enquiryRouter } from "./routes/enquiry.routes.js";
import { paymentRouter } from "./routes/payment.routes.js";
import { requireSuperAdmin } from "./middleware/session.js";
import { env } from "./config/env.js";
import { authRouter } from "./routes/auth.routes.js";
import { adminUserRouter } from "./routes/admin-user.routes.js";
import { courseRouter } from "./routes/course.routes.js";
import { batchRouter } from "./routes/batch.routes.js";
import { admissionRouter } from "./routes/admission.routes.js";
import { attendanceRouter } from "./routes/attendance.routes.js";
import { activityRouter, exportRouter } from "./routes/tools.routes.js";
import { getPublicInstituteController } from "./controllers/tools.controller.js";
import { feeRouter } from "./routes/fee.routes.js";
import { studentRouter } from "./routes/student.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { recoveryRouter } from "./routes/recovery.routes.js";

export const app = express();

// Standard HTTP security headers.
app.use(
  (helmetModule.default as unknown as
    () => import("express").RequestHandler)()
);


app.disable("x-powered-by");

app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    // Lets the admin read the file name of Excel exports.
    exposedHeaders: ["Content-Disposition"],
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
app.use("/api/batches", batchRouter);
app.use("/api/admissions", admissionRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/fees", requireSuperAdmin, feeRouter);
app.use("/api/payments", requireSuperAdmin, paymentRouter);
app.use("/api/settings", requireSuperAdmin, settingsRouter);
app.use("/api/activity", requireSuperAdmin, activityRouter);
app.use("/api/exports", requireSuperAdmin, exportRouter);
// Public: the website reads the institute's contact details.
app.get("/api/institute", getPublicInstituteController);
app.use("/api/recovery", recoveryRouter);

app.use("/api/enquiries", enquiryRouter);

export default app;
