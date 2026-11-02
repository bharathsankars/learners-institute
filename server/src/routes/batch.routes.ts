import { Router } from "express";
import { requireAuthenticated, requireManager } from "../middleware/session.js";

import {
  assignBatchStudentController,
  createBatchController,
  deleteBatchController,
  getBatchesController,
  getBatchInstructorsController,
  getBatchStudentsController,
  removeBatchStudentController,
  updateBatchController,
} from "../controllers/batch.controller.js";

export const batchRouter = Router();

// Everyone signed in can list batches (the admission form needs them).
// Lecturers can open only their own batch's students; changes need an Admin.
batchRouter.use(requireAuthenticated);

batchRouter.get("/", getBatchesController);
batchRouter.get("/instructors", requireManager, getBatchInstructorsController);
batchRouter.post("/", requireManager, createBatchController);
batchRouter.patch("/:id", requireManager, updateBatchController);
batchRouter.delete("/:id", requireManager, deleteBatchController);

batchRouter.get("/:id/students", getBatchStudentsController);
batchRouter.post("/:id/students", requireManager, assignBatchStudentController);
batchRouter.delete("/:id/students/:studentId", requireManager, removeBatchStudentController);
