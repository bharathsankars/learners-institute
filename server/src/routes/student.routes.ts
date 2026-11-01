import { confirmStudentImportController, getStudentImportTemplateController, previewStudentImportController, studentImportUploadMiddleware } from "../controllers/student-import.controller.js";
import { Router } from "express";
import { requireAuthenticated } from "../middleware/session.js";
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

studentRouter.get("/import/template", getStudentImportTemplateController);
// Rate limits run before the upload is buffered.
studentRouter.post("/import/preview", studentImportPreviewRateLimit, studentImportUploadMiddleware, previewStudentImportController);
studentRouter.post("/import/confirm", studentImportConfirmRateLimit, studentImportUploadMiddleware, confirmStudentImportController);
studentRouter.get("/", getStudentsController);
studentRouter.get("/:id/enrollments", getStudentEnrollmentsController);
studentRouter.post("/:id/enrollments", assignStudentCourseController);
studentRouter.post("/", createStudentController);
studentRouter.patch("/:id", updateStudentController);
studentRouter.delete("/:id", rejectStudentDeletionController);
