import { confirmStudentImportController, getStudentImportTemplateController, previewStudentImportController, studentImportUploadMiddleware } from "../controllers/student-import.controller.js";
import { Router } from "express";
import { requireAuthenticated, requireManager } from "../middleware/session.js";
import { studentImportConfirmRateLimit, studentImportPreviewRateLimit } from "../middleware/studentImportRateLimit.js";

import {
  createStudentController,
  getStudentsController,
  rejectStudentDeletionController,
  updateStudentController,
} from "../controllers/student.controller.js";
import {
  getStudentEnrollmentsController,
  assignStudentCourseController,
} from "../controllers/enrollment.controller.js";

export const studentRouter = Router();

studentRouter.use(requireAuthenticated);

// Lecturers may view students and admit through /api/admissions; every
// other change to the register needs an Admin.
studentRouter.get("/import/template", requireManager, getStudentImportTemplateController);
// Rate limits run before the upload is buffered.
studentRouter.post("/import/preview", requireManager, studentImportPreviewRateLimit, studentImportUploadMiddleware, previewStudentImportController);
studentRouter.post("/import/confirm", requireManager, studentImportConfirmRateLimit, studentImportUploadMiddleware, confirmStudentImportController);
studentRouter.get("/", getStudentsController);
studentRouter.get("/:id/enrollments", getStudentEnrollmentsController);
studentRouter.post("/:id/enrollments", requireManager, assignStudentCourseController);
studentRouter.post("/", requireManager, createStudentController);
studentRouter.patch("/:id", requireManager, updateStudentController);
studentRouter.delete("/:id", rejectStudentDeletionController);
