import type { Request, Response } from "express";

import { ZodError } from "zod";

import {
  createStudent,
  deleteStudent,
  getStudents,
  updateStudent,
} from "../services/student.service.js";

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

    const student = await createStudent(input);

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
   DELETE STUDENT
   ========================================================= */

export async function deleteStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = studentIdSchema.parse(req.params.id);

    await deleteStudent(studentId);

    res.status(200).json({
      success: true,
      message: "Student deleted successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });

      return;
    }

    if (isPrismaError(error, "P2025")) {
      res.status(404).json({
        success: false,
        message: "Student not found.",
      });

      return;
    }

    if (isPrismaError(error, "P2003")) {
      res.status(409).json({
        success: false,
        message:
          "This student cannot be deleted because they have linked enrolment or enquiry records. Mark the student as inactive instead.",
      });

      return;
    }

    console.error("Failed to delete student:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete student.",
    });
  }
}
