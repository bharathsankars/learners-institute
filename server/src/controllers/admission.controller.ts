import { logActivity } from "../services/activity.service.js";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  AdmissionConflictError,
  AdmissionForbiddenError,
  AdmissionNotFoundError,
  createAdmission,
} from "../services/admission.service.js";
import { BatchConflictError, BatchNotFoundError } from "../services/batch.service.js";
import { StudentDuplicateError } from "../services/student-duplicate.service.js";
import { admissionSchema } from "../validators/admission.validator.js";

function sendAdmissionError(error: unknown, res: Response, action: string): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Please check the admission details.",
      errors: error.flatten().fieldErrors,
    });

    return;
  }

  if (error instanceof AdmissionForbiddenError) {
    res.status(403).json({ success: false, message: error.message });

    return;
  }

  if (error instanceof AdmissionNotFoundError || error instanceof BatchNotFoundError) {
    res.status(404).json({ success: false, message: error.message });

    return;
  }

  if (error instanceof AdmissionConflictError || error instanceof BatchConflictError) {
    res.status(409).json({ success: false, message: error.message });

    return;
  }

  if (error instanceof StudentDuplicateError) {
    res.status(409).json({
      success: false,
      message: error.message,
      data: { admissionNumber: error.admissionNumber },
    });

    return;
  }

  console.error(`Failed to ${action}:`, error);

  res.status(500).json({ success: false, message: `Unable to ${action}.` });
}

export async function createAdmissionController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = admissionSchema.parse(req.body);
    const admission = await createAdmission(input, {
      userId: res.locals.userId ?? null,
      role: res.locals.userRole ?? null,
    });

    await logActivity(res, () => ({
      action: "student.admitted",
      entityType: "student",
      entityId: admission.id,
      summary: `Admitted ${[admission.firstName, admission.lastName].filter(Boolean).join(" ")} (${admission.admissionNumber}) to ${admission.enrollments.map((enrollment) => enrollment.course.title).join(", ")}${admission.batch ? ` · ${admission.batch.name}` : ""}${input.enquiryId ? " from an enquiry" : ""}`,
    }));

    res.status(201).json({
      success: true,
      message: `${admission.firstName} admitted · ${admission.admissionNumber}.`,
      data: { admission },
    });
  } catch (error) {
    sendAdmissionError(error, res, "complete the admission");
  }
}
