import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  createCourse,
  deleteCourse,
  getActiveCourses,
  getCourseById,
  getCourses,
  updateCourse,
} from "../services/course.service.js";

import {
  courseIdSchema,
  createCourseSchema,
  updateCourseSchema,
} from "../validators/course.validator.js";

function isPrismaError(
  error: unknown,
  code: string,
): error is { code: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function sendValidationError(error: ZodError, res: Response): void {
  res.status(400).json({
    success: false,
    message: "Invalid course data.",
    errors: error.flatten().fieldErrors,
  });
}

export async function createCourseController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = createCourseSchema.parse(req.body);

    const course = await createCourse(input);

    res.status(201).json({
      success: true,
      message: "Course created successfully.",
      data: {
        course,
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
        message: "A course with this slug already exists.",
      });

      return;
    }

    console.error("Failed to create course:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create course.",
    });
  }
}

export async function getCoursesController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const courses = await getCourses();

    res.status(200).json({
      success: true,
      data: {
        courses,
      },
    });
  } catch (error) {
    console.error("Failed to retrieve courses:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve courses.",
    });
  }
}

export async function getActiveCoursesController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const courses = await getActiveCourses();

    res.status(200).json({
      success: true,
      data: {
        courses,
      },
    });
  } catch (error) {
    console.error("Failed to retrieve active courses:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve courses.",
    });
  }
}

export async function getCourseByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const courseId = courseIdSchema.parse(req.params.id);

    const course = await getCourseById(courseId);

    if (!course) {
      res.status(404).json({
        success: false,
        message: "Course not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: {
        course,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });

      return;
    }

    console.error("Failed to retrieve course:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve course.",
    });
  }
}

export async function updateCourseController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const courseId = courseIdSchema.parse(req.params.id);

    const input = updateCourseSchema.parse(req.body);

    const course = await updateCourse(courseId, input);

    res.status(200).json({
      success: true,
      message: "Course updated successfully.",
      data: {
        course,
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
        message: "A course with this slug already exists.",
      });

      return;
    }

    if (isPrismaError(error, "P2025")) {
      res.status(404).json({
        success: false,
        message: "Course not found.",
      });

      return;
    }

    console.error("Failed to update course:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update course.",
    });
  }
}

export async function deleteCourseController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const courseId = courseIdSchema.parse(req.params.id);

    await deleteCourse(courseId);

    res.status(200).json({
      success: true,
      message: "Course deleted successfully.",
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid course ID.",
      });

      return;
    }

    if (isPrismaError(error, "P2025")) {
      res.status(404).json({
        success: false,
        message: "Course not found.",
      });

      return;
    }

    if (isPrismaError(error, "P2003")) {
      res.status(409).json({
        success: false,
        message: "This course has student enrollments and cannot be deleted. To hide it from the homepage, edit the course and uncheck Active course. Existing enrollment records will be preserved.",
      });
      return;
    }

    console.error("Failed to delete course:", error);

    res.status(500).json({
      success: false,
      message: "Unable to delete course.",
    });
  }
}
