import { logActivity } from "../services/activity.service.js";
import { prisma } from "../config/database.js";
import multer from "multer";
import { z } from "zod";
import {
  previewStudentImport,
  StudentImportValidationError,
} from "../services/student-import-preview.service.js";
import {
  confirmStudentImport,
  StudentImportConflictError,
  StudentImportNotEligibleError,
} from "../services/student-import-confirm.service.js";
import type { Request, Response } from "express";
import ExcelJS from "exceljs";

export async function getStudentImportTemplateController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const courses = await prisma.course.findMany({
      where: { isActive: true },
      select: { title: true },
      orderBy: [{ displayOrder: "asc" }, { title: "asc" }],
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Learners Commercial Institute";

    const sheet = workbook.addWorksheet("Students", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    sheet.columns = [
      { header: "Student Name", key: "name", width: 32 },
      { header: "Phone", key: "phone", width: 22 },
      { header: "Email", key: "email", width: 32 },
      { header: "DOB (DD-MM-YYYY)", key: "dob", width: 24 },
      { header: "Courses Enrolled", key: "courses", width: 65 },
      { header: "Address", key: "address", width: 48 },
    ];

    sheet.getRow(1).font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF17365D" },
    };

    sheet.autoFilter = "A1:F1";

    // Preserve phone numbers and dates as text.
    sheet.getColumn(2).numFmt = "@";
    sheet.getColumn(4).numFmt = "@";

    const reference = workbook.addWorksheet("Available Courses");
    reference.getColumn(1).width = 55;
    reference.getCell("A1").value = "Available Course Names";
    reference.getCell("A1").font = { bold: true };

    courses.forEach((course, index) => {
      reference.getCell(index + 2, 1).value = course.title;
    });

    const instructions = workbook.addWorksheet("Instructions");
    instructions.getColumn(1).width = 105;

    [
      "Learners Commercial Institute — Student Import",
      "Fill the Students worksheet without changing the headers.",
      "Student Name and Phone are required.",
      "Enter the student's full name in Student Name.",
      "Enter dates as DD-MM-YYYY, for example 21-08-2005.",
      "For multiple courses, separate course names with commas.",
      "Copy exact course names from the Available Courses worksheet.",
      "Do not enter admission numbers; they are generated automatically.",
      "Leave unknown optional fields blank.",
      "Uploading and previewing will not create student records or login accounts.",
    ].forEach((line) => instructions.addRow([line]));

    instructions.getCell("A1").font = {
      bold: true,
      size: 14,
    };

    const output = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="learners-student-import-template.xlsx"',
    );
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(Buffer.from(output));
  } catch (error) {
    console.error("Failed to generate student import template:", error);

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "Unable to generate student import template.",
      });
    }
  }
}

export const studentImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
    // Only "requestId" is expected alongside the file.
    fields: 1,
    fieldSize: 100,
    parts: 2,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.originalname.toLowerCase().endsWith(".xlsx")) {
      callback(new Error("Only .xlsx files are supported."));
      return;
    }

    callback(null, true);
  },
}).single("file");

export function studentImportUploadMiddleware(
  req: Request,
  res: Response,
  next: import("express").NextFunction,
): void {
  studentImportUpload(req, res, (error: unknown) => {
    if (error) {
      res.status(400).json({
        success: false,
        message:
          error instanceof Error ? error.message : "Invalid upload.",
      });
      return;
    }

    next();
  });
}

export async function previewStudentImportController(
  req: Request,
  res: Response,
): Promise<void> {
  if (!req.file) {
    res.status(400).json({
      success: false,
      message: "An Excel file is required.",
    });
    return;
  }

  try {
    const preview = await previewStudentImport(req.file.buffer);

    res.status(200).json({
      success: true,
      data: preview,
    });
  } catch (error) {
    if (error instanceof StudentImportValidationError) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error("Student import preview failed:", error);
    res.status(500).json({
      success: false,
      message: "Unable to preview student import.",
    });
  }
}

const confirmSchema = z.object({
  requestId: z.string().uuid("A valid import request ID is required."),
});

export async function confirmStudentImportController(
  req: Request,
  res: Response,
): Promise<void> {
  const body = confirmSchema.safeParse(req.body ?? {});

  if (!body.success) {
    res.status(400).json({
      success: false,
      message: "A valid import request ID is required.",
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({
      success: false,
      message: "An Excel file is required.",
    });
    return;
  }

  try {
    // Set by requireAuthenticated.
    const userId: unknown = res.locals.userId;

    const result = await confirmStudentImport({
      buffer: req.file.buffer,
      requestId: body.data.requestId,
      importedById: typeof userId === "string" ? userId : null,
    });

    if (!result.replayed) {
      await logActivity(res, () => ({ action: "student.imported", entityType: "student", summary: `Imported ${result.studentCount} students from Excel` }));
    }

    res.status(result.replayed ? 200 : 201).json({
      success: true,
      message: result.replayed
        ? "This import was already completed."
        : `${result.studentCount} students imported successfully.`,
      data: result,
    });
  } catch (error) {
    if (error instanceof StudentImportValidationError) {
      res.status(400).json({ success: false, message: error.message });
      return;
    }

    if (error instanceof StudentImportNotEligibleError) {
      res.status(409).json({
        success: false,
        message: error.message,
        data: { preview: error.preview },
      });
      return;
    }

    if (error instanceof StudentImportConflictError) {
      res.status(409).json({ success: false, message: error.message });
      return;
    }

    console.error("Student import confirmation failed:", error);
    res.status(500).json({
      success: false,
      message: "The import failed and no students were saved. Please try again.",
    });
  }
}
