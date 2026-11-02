import { logActivity } from "../services/activity.service.js";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import { enrollmentStudentIdSchema } from "../validators/enrollment.validator.js";
import {
  getStudentEnrollments,
  assignStudentCourse,
  EnrollmentNotFoundError,
  EnrollmentConflictError,
} from "../services/enrollment.service.js";
import { assignEnrollmentSchema } from "../validators/enrollment.validator.js";

export async function getStudentEnrollmentsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = enrollmentStudentIdSchema.parse(req.params.id);
    const enrollments = await getStudentEnrollments(studentId);

    if (enrollments === null) {
      res.status(404).json({
        success: false,
        message: "Student not found.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: { enrollments },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
      return;
    }

    console.error("Failed to retrieve student enrollments:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve student enrollments.",
    });
  }
}

export async function assignStudentCourseController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const studentId = enrollmentStudentIdSchema.parse(req.params.id);
    const input = assignEnrollmentSchema.parse(req.body);

    const enrollment = await assignStudentCourse(
      studentId,
      input.courseId,
    );

    await logActivity(res, () => ({ action: "enrollment.created", entityType: "student", entityId: studentId, summary: `Assigned ${enrollment.course.title} to a student` }));

    res.status(201).json({
      success: true,
      message: "Course assigned successfully.",
      data: { enrollment },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid enrollment data.",
      });
      return;
    }

    if (error instanceof EnrollmentNotFoundError) {
      res.status(404).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (error instanceof EnrollmentConflictError) {
      res.status(409).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({
        success: false,
        message: "Student is already enrolled in this course.",
      });
      return;
    }

    console.error("Failed to assign student course:", error);

    res.status(500).json({
      success: false,
      message: "Unable to assign course.",
    });
  }
}
