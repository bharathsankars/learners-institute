import { Router } from "express";
import { requireAuthenticated } from "../middleware/session.js";

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

courseRouter.post("/", createCourseController);
courseRouter.patch("/:id", updateCourseController);
courseRouter.delete("/:id", deleteCourseController);
