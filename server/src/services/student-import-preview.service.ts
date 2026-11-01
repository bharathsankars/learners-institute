import { createHash } from "node:crypto";
import ExcelJS from "exceljs";
import { prisma } from "../config/database.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { createStudentSchema } from "../validators/student.validator.js";
import { assertSafeXlsxArchive, XlsxArchiveError } from "../utils/xlsx-archive-guard.js";
import { duplicateKeys, normalizeName as normalize } from "./student-duplicate.service.js";

const HEADERS = [
  "Student Name",
  "Phone",
  "Email",
  "DOB (DD-MM-YYYY)",
  "Courses Enrolled",
  "Address",
];

const MAX_ROWS = 500;
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_CELL_LENGTH = 1000;

export class StudentImportValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StudentImportValidationError";
  }
}

type Db = Prisma.TransactionClient;

export type WorkbookRow = { rowNumber: number; values: string[] };

function cellText(cell: ExcelJS.Cell): string {
  const text = rawCellText(cell);

  if (text.length > MAX_CELL_LENGTH) {
    throw new StudentImportValidationError(
      `Cell ${cell.address} exceeds ${MAX_CELL_LENGTH} characters.`,
    );
  }

  return text;
}

function rawCellText(cell: ExcelJS.Cell): string {
  const value = cell.value;

  if (value === null || value === undefined) return "";

  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }

  if (value instanceof Date) {
    // Avoid silently misinterpreting Excel dates as DD-MM-YYYY.
    throw new StudentImportValidationError(
      "Use text formatted as DD-MM-YYYY for dates.",
    );
  }

  if (typeof value === "object") {
    if ("formula" in value || "sharedFormula" in value) {
      throw new StudentImportValidationError(
        "Formula cells are not supported.",
      );
    }

    if ("text" in value && typeof value.text === "string") {
      return value.text.trim();
    }

    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join("").trim();
    }
  }

  throw new StudentImportValidationError(
    "Unsupported spreadsheet cell type.",
  );
}

function convertDOB(value: string): string {
  if (!value) return "";

  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);

  if (!match) {
    throw new StudentImportValidationError(
      "Date of birth must use DD-MM-YYYY.",
    );
  }

  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const date = new Date(`${iso}T00:00:00.000Z`);

  if (
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== iso
  ) {
    throw new StudentImportValidationError(
      "Invalid calendar date.",
    );
  }

  return iso;
}

/**
 * Parses and structurally validates the uploaded workbook without
 * touching the database.
 */
export async function readStudentWorkbook(buffer: Buffer) {
  if (
    buffer.length > MAX_BYTES ||
    buffer.length < 4 ||
    !buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]))
  ) {
    throw new StudentImportValidationError(
      "Invalid or oversized Excel file.",
    );
  }

  try {
    assertSafeXlsxArchive(buffer);
  } catch (error) {
    if (error instanceof XlsxArchiveError) {
      throw new StudentImportValidationError(error.message);
    }
    throw error;
  }

  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(
      buffer as unknown as Parameters<typeof workbook.xlsx.load>[0],
    );
  } catch {
    throw new StudentImportValidationError(
      "Unable to read the Excel file. Upload a valid .xlsx workbook.",
    );
  }

  const sheet = workbook.getWorksheet("Students");

  if (!sheet) {
    throw new StudentImportValidationError(
      'Worksheet "Students" is missing.',
    );
  }

  for (let index = 0; index < HEADERS.length; index++) {
    if (cellText(sheet.getRow(1).getCell(index + 1)) !== HEADERS[index]) {
      throw new StudentImportValidationError(
        `Invalid template column ${index + 1}. Download the latest template.`,
      );
    }
  }

  if (sheet.actualColumnCount > HEADERS.length) {
    throw new StudentImportValidationError(
      "Unexpected columns. Use the official student template.",
    );
  }

  if (sheet.rowCount > MAX_ROWS + 1) {
    throw new StudentImportValidationError(
      `Maximum ${MAX_ROWS} student rows per file.`,
    );
  }

  const rows: WorkbookRow[] = [];

  for (let number = 2; number <= sheet.rowCount; number++) {
    const row = sheet.getRow(number);
    const values = Array.from({ length: HEADERS.length }, (_, index) =>
      cellText(row.getCell(index + 1)),
    );

    if (values.every((value) => !value)) continue;

    rows.push({ rowNumber: number, values });
  }

  if (rows.length === 0) {
    throw new StudentImportValidationError(
      "The spreadsheet contains no student records.",
    );
  }

  if (rows.length > MAX_ROWS) {
    throw new StudentImportValidationError(
      `Maximum ${MAX_ROWS} student rows per file.`,
    );
  }

  return {
    fileSha256: createHash("sha256").update(buffer).digest("hex"),
    rows,
  };
}

/**
 * Validates rows against current students and courses. Accepts the
 * shared client or an interactive-transaction client so confirmation
 * can re-run the identical checks under its locks.
 */
export async function evaluateStudentRows(rows: WorkbookRow[], db: Db) {
  const [existing, courses] = await Promise.all([
    db.student.findMany({
      select: {
        admissionNumber: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
      },
    }),
    db.course.findMany({
      select: {
        id: true,
        title: true,
        isActive: true,
      },
    }),
  ]);

  const courseLookup = new Map<string, typeof courses>();

  for (const course of courses) {
    const key = normalize(course.title);
    const matches = courseLookup.get(key) ?? [];
    matches.push(course);
    courseLookup.set(key, matches);
  }

  // Same rule as manual registration and enquiry admission.
  const existingByKey = new Map<string, string>();

  for (const student of existing) {
    for (const key of duplicateKeys(student)) {
      existingByKey.set(key, student.admissionNumber);
    }
  }

  const seenStudents = new Map<string, number>();

  const evaluated = rows.map(({ rowNumber, values }) => {
    const [studentName, phone, email, dob, coursesEnrolled, address] = values;

    const errors: string[] = [];
    const warnings: string[] = [];

    let dateOfBirth = "";

    if (dob) {
      try {
        dateOfBirth = convertDOB(dob);
      } catch (error) {
        errors.push(
          `dateOfBirth: ${error instanceof Error ? error.message : "Invalid date."}`,
        );
      }
    }

    // Preserve the full name without guessing how Indian names should split.
    const parsed = createStudentSchema.safeParse({
      firstName: studentName,
      phone,
      email,
      dateOfBirth,
      address,
    });

    if (!parsed.success) {
      errors.push(
        ...parsed.error.issues.map(
          (issue) => `${issue.path.join(".")}: ${issue.message}`,
        ),
      );
    }

    const selectedCourses: { id: string; title: string }[] = [];
    const seenCourses = new Set<string>();

    for (const rawName of (coursesEnrolled ?? "").split(",")) {
      const name = rawName.trim();
      if (!name) continue;

      const key = normalize(name);

      if (seenCourses.has(key)) {
        errors.push(`Duplicate course selection: ${name}.`);
        continue;
      }

      seenCourses.add(key);

      const matches = courseLookup.get(key) ?? [];

      const course = matches[0];

      if (!course) {
        errors.push(`Unknown course: ${name}.`);
      } else if (matches.length > 1) {
        errors.push(`Ambiguous course name: ${name}.`);
      } else if (!course.isActive) {
        errors.push(`Inactive course: ${name}.`);
      } else {
        selectedCourses.push({
          id: course.id,
          title: course.title,
        });
      }
    }

    if (parsed.success) {
      // Name plus phone or email: siblings sharing family contacts stay distinct.
      const keys = duplicateKeys(parsed.data);
      const previous = keys
        .map((key) => seenStudents.get(key))
        .find((row) => row !== undefined);

      if (previous !== undefined) {
        warnings.push(`Possible duplicate of spreadsheet row ${previous}.`);
      }

      for (const key of keys) {
        if (!seenStudents.has(key)) seenStudents.set(key, rowNumber);
      }

      const match = keys
        .map((key) => existingByKey.get(key))
        .find(Boolean);

      if (match) {
        warnings.push(
          `Possible existing student: ${match}.`,
        );
      }
    }

    return {
      rowNumber,
      data: {
        firstName: studentName,
        lastName: "",
        phone,
        email,
        dateOfBirth,
        gender: "",
        address,
        studentName,
        coursesEnrolled,
      },
      student: parsed.success ? parsed.data : null,
      selectedCourses,
      valid: errors.length === 0,
      errors,
      warnings,
    };
  });

  const invalidRows = evaluated.filter((row) => !row.valid).length;
  const warningRows = evaluated.filter((row) => row.warnings.length > 0).length;

  return {
    totalRows: evaluated.length,
    validRows: evaluated.length - invalidRows,
    invalidRows,
    warningRows,
    // Duplicate warnings must be resolved in the spreadsheet before import.
    eligible: evaluated.length > 0 && invalidRows === 0 && warningRows === 0,
    rows: evaluated,
  };
}

// Strips server-only fields before results leave the API.
export function toPreviewResponse(
  evaluation: Awaited<ReturnType<typeof evaluateStudentRows>>,
) {
  return {
    ...evaluation,
    rows: evaluation.rows.map(({ student: _student, ...row }) => row),
  };
}

export async function previewStudentImport(buffer: Buffer) {
  const { rows } = await readStudentWorkbook(buffer);
  return toPreviewResponse(await evaluateStudentRows(rows, prisma));
}
