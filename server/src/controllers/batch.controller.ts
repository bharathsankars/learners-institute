import { logActivity } from "../services/activity.service.js";
import type { Request, Response } from "express";
import { ZodError } from "zod";

import {
  assignBatchStudent,
  BatchConflictError,
  BatchForbiddenError,
  BatchNotFoundError,
  createBatch,
  deleteBatch,
  getBatchInstructors,
  getBatches,
  getBatchStudents,
  removeBatchStudent,
  updateBatch,
} from "../services/batch.service.js";

import {
  batchIdSchema,
  batchInputSchema,
  batchStudentSchema,
} from "../validators/batch.validator.js";

function isPrismaError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

// Shared error mapping for every batch endpoint.
function sendBatchError(error: unknown, res: Response, action: string): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: "Invalid batch data.",
      errors: error.flatten().fieldErrors,
    });

    return;
  }

  if (error instanceof BatchForbiddenError) {
    res.status(403).json({ success: false, message: error.message });

    return;
  }

  if (error instanceof BatchNotFoundError) {
    res.status(404).json({ success: false, message: error.message });

    return;
  }

  if (error instanceof BatchConflictError) {
    res.status(409).json({ success: false, message: error.message });

    return;
  }

  if (isPrismaError(error, "P2002")) {
    res.status(409).json({
      success: false,
      message: "A batch with this name already exists.",
    });

    return;
  }

  if (isPrismaError(error, "P2025")) {
    res.status(404).json({ success: false, message: "Batch not found." });

    return;
  }

  if (isPrismaError(error, "P2003")) {
    res.status(409).json({
      success: false,
      message: "Move or remove the students in this batch before deleting it.",
    });

    return;
  }

  console.error(`Failed to ${action}:`, error);

  res.status(500).json({
    success: false,
    message: `Unable to ${action}.`,
  });
}

export async function getBatchesController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const batches = await getBatches();

    res.status(200).json({ success: true, data: { batches } });
  } catch (error) {
    sendBatchError(error, res, "retrieve batches");
  }
}

export async function getBatchInstructorsController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const instructors = await getBatchInstructors();

    res.status(200).json({ success: true, data: { instructors } });
  } catch (error) {
    sendBatchError(error, res, "retrieve instructors");
  }
}

export async function createBatchController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = batchInputSchema.parse(req.body);
    const batch = await createBatch(input);

    await logActivity(res, () => ({ action: "batch.created", entityType: "batch", entityId: batch.id, summary: `Added batch ${batch.name}` }));

    res.status(201).json({
      success: true,
      message: "Batch created successfully.",
      data: { batch },
    });
  } catch (error) {
    sendBatchError(error, res, "create batch");
  }
}

export async function updateBatchController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const batchId = batchIdSchema.parse(req.params.id);
    const input = batchInputSchema.parse(req.body);
    const batch = await updateBatch(batchId, input);

    await logActivity(res, () => ({ action: "batch.updated", entityType: "batch", entityId: batch.id, summary: `Updated batch ${batch.name}${batch.isActive ? "" : " (archived)"}` }));

    res.status(200).json({
      success: true,
      message: "Batch updated successfully.",
      data: { batch },
    });
  } catch (error) {
    sendBatchError(error, res, "update batch");
  }
}

export async function deleteBatchController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const batchId = batchIdSchema.parse(req.params.id);

    const deleted = await deleteBatch(batchId);

    await logActivity(res, () => ({ action: "batch.deleted", entityType: "batch", entityId: batchId, summary: `Deleted batch ${deleted.name}` }));

    res.status(200).json({ success: true, message: "Batch deleted successfully." });
  } catch (error) {
    sendBatchError(error, res, "delete batch");
  }
}

export async function getBatchStudentsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const batchId = batchIdSchema.parse(req.params.id);
    const students = await getBatchStudents(batchId, {
      userId: res.locals.userId ?? null,
      role: res.locals.userRole ?? null,
    });

    if (students === null) {
      res.status(404).json({ success: false, message: "Batch not found." });

      return;
    }

    res.status(200).json({ success: true, data: { students } });
  } catch (error) {
    sendBatchError(error, res, "retrieve batch students");
  }
}

export async function assignBatchStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const batchId = batchIdSchema.parse(req.params.id);
    const { studentId } = batchStudentSchema.parse(req.body);
    const { student, batchName } = await assignBatchStudent(batchId, studentId);

    await logActivity(res, () => ({ action: "batch.student_added", entityType: "batch", entityId: batchId, summary: `Added ${[student.firstName, student.lastName].filter(Boolean).join(" ")} to ${batchName}` }));

    res.status(200).json({
      success: true,
      message: "Student added to the batch.",
      data: { student },
    });
  } catch (error) {
    sendBatchError(error, res, "add student to batch");
  }
}

export async function removeBatchStudentController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const batchId = batchIdSchema.parse(req.params.id);
    const { studentId } = batchStudentSchema.parse({ studentId: req.params.studentId });

    const removed = await removeBatchStudent(batchId, studentId);

    await logActivity(res, () => ({ action: "batch.student_removed", entityType: "batch", entityId: batchId, summary: `Removed ${removed.studentName} from ${removed.batchName}` }));

    res.status(200).json({ success: true, message: "Student removed from the batch." });
  } catch (error) {
    sendBatchError(error, res, "remove student from batch");
  }
}
