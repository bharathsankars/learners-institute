import { randomUUID } from "node:crypto";
import { prisma } from "../config/database.js";
import {
  evaluateStudentRows,
  readStudentWorkbook,
  toPreviewResponse,
} from "./student-import-preview.service.js";
import { lockStudentRegistration } from "./student-duplicate.service.js";

export type ImportedStudent = {
  rowNumber: number;
  id: string;
  admissionNumber: string;
  name: string;
  phone: string;
  courses: string[];
};

export type StudentImportResult = {
  batchId: string;
  importedAt: string;
  studentCount: number;
  enrollmentCount: number;
  students: ImportedStudent[];
};

export class StudentImportConflictError extends Error {}

// The batch changed since preview (or never qualified); carries the fresh report.
export class StudentImportNotEligibleError extends Error {
  constructor(public preview: ReturnType<typeof toPreviewResponse>) {
    super(
      "This import can no longer be confirmed. Review the updated validation report.",
    );
  }
}

export async function confirmStudentImport(input: {
  buffer: Buffer;
  requestId: string;
  importedById: string | null;
}): Promise<StudentImportResult & { replayed: boolean }> {
  // Parse outside the transaction so no locks are held during workbook parsing.
  const workbook = await readStudentWorkbook(input.buffer);

  return prisma.$transaction(
    async (tx) => {
      // Serializes against manual registration and enquiry admission too,
      // so the duplicate checks below see every committed student.
      await lockStudentRegistration(tx);

      const previous = await tx.studentImportBatch.findUnique({
        where: { requestId: input.requestId },
      });

      if (previous) {
        if (previous.fileSha256 !== workbook.fileSha256) {
          throw new StudentImportConflictError(
            "This import request was already used for a different workbook.",
          );
        }

        return {
          ...(previous.result as unknown as StudentImportResult),
          replayed: true,
        };
      }

      const sameFile = await tx.studentImportBatch.findFirst({
        where: { fileSha256: workbook.fileSha256 },
        orderBy: { createdAt: "asc" },
      });

      if (sameFile) {
        throw new StudentImportConflictError(
          `This workbook was already imported on ${sameFile.createdAt.toISOString().slice(0, 10)} (${sameFile.studentCount} students).`,
        );
      }

      // Block course edits (e.g. deactivation) until this batch commits.
      await tx.$queryRaw`SELECT id FROM courses FOR SHARE`;

      const evaluation = await evaluateStudentRows(workbook.rows, tx);

      if (!evaluation.eligible) {
        throw new StudentImportNotEligibleError(toPreviewResponse(evaluation));
      }

      const planned = evaluation.rows.map((row) => {
        const student = row.student!;
        return {
          rowNumber: row.rowNumber,
          courses: row.selectedCourses,
          data: {
            id: randomUUID(),
            firstName: student.firstName,
            phone: student.phone,
            email: student.email?.toLowerCase() ?? null,
            dateOfBirth: student.dateOfBirth
              ? new Date(`${student.dateOfBirth}T00:00:00.000Z`)
              : null,
            address: student.address ?? null,
          },
        };
      });

      // Admission numbers come from the column default, i.e. the LIT allocator.
      const created = await tx.student.createManyAndReturn({
        data: planned.map((entry) => entry.data),
        select: { id: true, admissionNumber: true },
      });

      const admissionNumbers = new Map(
        created.map((student) => [student.id, student.admissionNumber]),
      );

      if (
        created.length !== planned.length ||
        planned.some((entry) => !admissionNumbers.has(entry.data.id))
      ) {
        throw new Error("Student import created an unexpected set of records.");
      }

      const enrollments = planned.flatMap((entry) =>
        entry.courses.map((course) => ({
          studentId: entry.data.id,
          courseId: course.id,
        })),
      );

      if (enrollments.length > 0) {
        const { count } = await tx.enrollment.createMany({ data: enrollments });

        if (count !== enrollments.length) {
          throw new Error("Student import created an unexpected number of enrollments.");
        }
      }

      const batchId = randomUUID();
      const importedAt = new Date();

      const result: StudentImportResult = {
        batchId,
        importedAt: importedAt.toISOString(),
        studentCount: planned.length,
        enrollmentCount: enrollments.length,
        students: planned.map((entry) => ({
          rowNumber: entry.rowNumber,
          id: entry.data.id,
          admissionNumber: admissionNumbers.get(entry.data.id)!,
          name: entry.data.firstName,
          phone: entry.data.phone,
          courses: entry.courses.map((course) => course.title),
        })),
      };

      await tx.studentImportBatch.create({
        data: {
          id: batchId,
          requestId: input.requestId,
          fileSha256: workbook.fileSha256,
          studentCount: planned.length,
          importedById: input.importedById,
          result,
          createdAt: importedAt,
        },
      });

      return { ...result, replayed: false };
    },
    {
      // A 500-row batch with enrollments needs more than the 5 s default.
      maxWait: 10_000,
      timeout: 60_000,
    },
  );
}
