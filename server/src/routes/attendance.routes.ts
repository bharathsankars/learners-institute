import { Router } from "express";
import { requireAuthenticated } from "../middleware/session.js";

import {
  getAttendanceMonthController,
  getAttendanceSheetController,
  saveAttendanceController,
} from "../controllers/attendance.controller.js";

// Every signed-in role; lecturers are limited to their own batches in the service.
export const attendanceRouter = Router();

attendanceRouter.use(requireAuthenticated);

attendanceRouter.get("/sheet", getAttendanceSheetController);
attendanceRouter.put("/sheet", saveAttendanceController);
attendanceRouter.get("/month", getAttendanceMonthController);
