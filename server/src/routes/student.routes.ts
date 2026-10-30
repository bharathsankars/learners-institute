import { Router } from "express";
import { requireAuthenticated } from "../middleware/session.js";

import {
  createStudentController,
  deleteStudentController,
  getStudentsController,
  updateStudentController,
} from "../controllers/student.controller.js";
import {
  getStudentEnrollmentsController,
  assignStudentCourseController,
} from "../controllers/enrollment.controller.js";

export const studentRouter = Router();

studentRouter.use(requireAuthenticated);

studentRouter.get("/", getStudentsController);
studentRouter.get("/:id/enrollments", getStudentEnrollmentsController);
studentRouter.post("/:id/enrollments", assignStudentCourseController);
studentRouter.post("/", createStudentController);
studentRouter.patch("/:id", updateStudentController);
studentRouter.delete("/:id", deleteStudentController);
