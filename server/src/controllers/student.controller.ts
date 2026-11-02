import { logActivity } from "../services/activity.service.js";
import type { Request, Response } from "express";

import { ZodError } from "zod";

import {
  createStudent,
  getStudents,
  updateStudent,
} from "../services/student.service.js";
import { StudentDuplicateError } from "../services/student-duplicate.service.js";

import {
  createStudentSchema,
  studentIdSchema,
  updateStudentSchema,
} from "../validators/student.validator.js";

function isPrismaError(
  error: unknown,
  code: string,
): error is {
  code: string;
  meta?: unknown;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (
      error as {
        code?: unknown;
      }
    ).code === code
  );
}

function sendValidationError(error: ZodError, res: Response): void {
  res.status(400).json({
    success: false,
    message: "Invalid student data.",
    errors: error.flatten().fieldErrors,
  });
}

/* =========================================================
   CREATE STUDENT
   ========================================================= */

export async function createStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = createStudentSchema.parse(req.body);

    const student = await createStudent(input, res.locals.userId ?? null);

    await logActivity(res, () => ({
      action: "student.created",
      entityType: "student",
      entityId: student.id,
      summary: `Added ${[student.firstName, student.lastName].filter(Boolean).join(" ")} (${student.admissionNumber})`,
    }));

    res.status(201).json({
      success: true,
      message: "Student created successfully.",
      data: {
        student,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(error, res);

      return;
    }

    if (error instanceof StudentDuplicateError) {
      res.status(409).json({
        success: false,
        message: error.message,
        data: {
          admissionNumber: error.admissionNumber,
        },
      });

      return;
    }

    if (isPrismaError(error, "P2002")) {
      res.status(409).json({
        success: false,
        message: "A student with this information already exists.",
      });

      return;
    }

    console.error("Failed to create student:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create student.",
    });
  }
}

/* =========================================================
   GET STUDENTS
   ========================================================= */

export async function getStudentsController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const students = await getStudents();

    res.status(200).json({
      success: true,
      data: {
        students,
      },
    });
  } catch (error) {
    console.error("Failed to retrieve students:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve students.",
    });
  }
}

/* =========================================================
   UPDATE STUDENT
   ========================================================= */

export async function updateStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = studentIdSchema.parse(req.params.id);

    const input = updateStudentSchema.parse(req.body);

    const student = await updateStudent(studentId, input);

    await logActivity(res, () => ({
      action: "student.updated",
      entityType: "student",
      entityId: student.id,
      summary: `Updated ${[student.firstName, student.lastName].filter(Boolean).join(" ")} (${student.admissionNumber})`,
    }));

    res.status(200).json({
      success: true,
      message: "Student updated successfully.",
      data: {
        student,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      sendValidationError(error, res);

      return;
    }

    if (isPrismaError(error, "P2025")) {
      res.status(404).json({
        success: false,
        message: "Student not found.",
      });

      return;
    }

    console.error("Failed to update student:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update student.",
    });
  }
}

/* =========================================================
   DELETE STUDENT (DISABLED)
   ========================================================= */

// The student register is permanent so admissions, enrolments and fee plans
// stay traceable. Students leave the register by status, never by deletion.
export function rejectStudentDeletionController(
  _req: Request,
  res: Response,
): void {
  res.status(405).json({
    success: false,
    message:
      "Student records cannot be deleted. Mark the student as inactive or completed instead.",
  });
}
