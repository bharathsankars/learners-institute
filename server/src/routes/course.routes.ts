import { Router } from "express";
import { requireAuthenticated, requireManager } from "../middleware/session.js";

import {
  createCourseController,
  deleteCourseController,
  getActiveCoursesController,
  getCourseByIdController,
  getCoursesController,
  updateCourseController,
} from "../controllers/course.controller.js";

export const courseRouter = Router();

// The homepage catalogue is public; all remaining course routes require login.
courseRouter.get("/public", getActiveCoursesController);
courseRouter.use(requireAuthenticated);
courseRouter.get("/", getCoursesController);
courseRouter.get("/:id", getCourseByIdController);

// Lecturers see the catalogue read-only.
courseRouter.post("/", requireManager, createCourseController);
courseRouter.patch("/:id", requireManager, updateCourseController);
courseRouter.delete("/:id", requireManager, deleteCourseController);
