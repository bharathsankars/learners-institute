import type { Request, Response } from "express";
import { ZodError } from "zod";

import { logActivity } from "../services/activity.service.js";
import {
  AttendanceConflictError,
  AttendanceForbiddenError,
  AttendanceNotFoundError,
  getAttendanceMonth,
  getAttendanceSheet,
  saveAttendance,
  type Viewer,
} from "../services/attendance.service.js";
import {
  attendanceMonthQuerySchema,
  attendanceSaveSchema,
  attendanceSheetQuerySchema,
} from "../validators/attendance.validator.js";

function viewer(res: Response): Viewer {
  return { userId: res.locals.userId ?? null, role: res.locals.userRole ?? null };
}

function sendAttendanceError(error: unknown, res: Response, action: string) {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: error.issues[0]?.message ?? "Invalid attendance data.",
      errors: error.flatten().fieldErrors,
    });
    return;
  }

  if (error instanceof AttendanceForbiddenError) {
    res.status(403).json({ success: false, message: error.message });
    return;
  }

  if (error instanceof AttendanceNotFoundError) {
    res.status(404).json({ success: false, message: error.message });
    return;
  }

  if (error instanceof AttendanceConflictError) {
    res.status(409).json({ success: false, message: error.message });
    return;
  }

  console.error(`Failed to ${action}:`, error);
  res.status(500).json({ success: false, message: `Unable to ${action}.` });
}

export async function getAttendanceSheetController(req: Request, res: Response): Promise<void> {
  try {
    const { batchId, date } = attendanceSheetQuerySchema.parse(req.query);

    res.status(200).json({ success: true, data: await getAttendanceSheet(batchId, date, viewer(res)) });
  } catch (error) {
    sendAttendanceError(error, res, "load attendance");
  }
}

export async function saveAttendanceController(req: Request, res: Response): Promise<void> {
  try {
    const input = attendanceSaveSchema.parse(req.body);
    const result = await saveAttendance(input, viewer(res));

    await logActivity(res, () => ({
      action: "attendance.marked",
      entityType: "batch",
      entityId: input.batchId,
      summary: `Marked attendance for ${result.batchName} on ${input.date} (${result.present} present, ${result.absent} absent)`,
    }));

    res.status(200).json({
      success: true,
      message: `Attendance saved · ${result.present} present, ${result.absent} absent.`,
      data: await getAttendanceSheet(input.batchId, input.date, viewer(res)),
    });
  } catch (error) {
    sendAttendanceError(error, res, "save attendance");
  }
}

export async function getAttendanceMonthController(req: Request, res: Response): Promise<void> {
  try {
    const { batchId, month } = attendanceMonthQuerySchema.parse(req.query);

    res.status(200).json({ success: true, data: await getAttendanceMonth(batchId, month, viewer(res)) });
  } catch (error) {
    sendAttendanceError(error, res, "load the monthly register");
  }
}
