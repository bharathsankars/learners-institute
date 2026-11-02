import { prisma } from "../config/database.js";

import type { AttendanceSaveInput } from "../validators/attendance.validator.js";

export class AttendanceNotFoundError extends Error {}
export class AttendanceConflictError extends Error {}
export class AttendanceForbiddenError extends Error {}

export type Viewer = { userId: string | null; role: string | null };

// Lecturers may correct recent classes only; admins can fix any past day.
export const LECTURER_EDIT_DAYS = 7;

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

// Today's date at the institute, as YYYY-MM-DD.
export function instituteToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

function toDate(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function daysBetween(from: string, to: string) {
  return Math.round((toDate(to).getTime() - toDate(from).getTime()) / 86_400_000);
}

const studentSelect = {
  id: true,
  admissionNumber: true,
  firstName: true,
  lastName: true,
} as const;

async function loadBatch(batchId: string, viewer: Viewer) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      name: true,
      days: true,
      startMinutes: true,
      endMinutes: true,
      isActive: true,
      instructorId: true,
    },
  });

  if (!batch) {
    throw new AttendanceNotFoundError("Batch not found.");
  }

  if (viewer.role === "STAFF" && batch.instructorId !== viewer.userId) {
    throw new AttendanceForbiddenError("You can only take attendance for the batches you teach.");
  }

  return batch;
}

// The register for one class: everyone now in the batch, with any marks
// already saved for that day.
export async function getAttendanceSheet(batchId: string, date: string, viewer: Viewer) {
  const batch = await loadBatch(batchId, viewer);

  const [students, records] = await Promise.all([
    prisma.student.findMany({
      where: { batchId },
      select: studentSelect,
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    prisma.attendance.findMany({
      where: { batchId, date: toDate(date) },
      select: {
        studentId: true,
        status: true,
        updatedAt: true,
        markedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const statuses = new Map(records.map((record) => [record.studentId, record.status]));
  const latest = records[0];

  return {
    batch,
    date,
    today: instituteToday(),
    scheduled: batch.days.includes(WEEKDAYS[toDate(date).getUTCDay()]!),
    canEdit: canEdit(date, viewer),
    marked: records.length > 0,
    markedBy: latest?.markedBy ?? null,
    markedAt: latest?.updatedAt ?? null,
    students: students.map((student) => ({
      ...student,
      status: statuses.get(student.id) ?? null,
    })),
  };
}

function canEdit(date: string, viewer: Viewer) {
  const age = daysBetween(date, instituteToday());

  if (age < 0) return false;

  return viewer.role !== "STAFF" || age <= LECTURER_EDIT_DAYS;
}

// Saves (or corrects) one class's register in a single transaction.
export async function saveAttendance(input: AttendanceSaveInput, viewer: Viewer) {
  const batch = await loadBatch(input.batchId, viewer);
  const age = daysBetween(input.date, instituteToday());

  if (age < 0) {
    throw new AttendanceConflictError("Attendance cannot be marked for a future date.");
  }

  if (viewer.role === "STAFF" && age > LECTURER_EDIT_DAYS) {
    throw new AttendanceForbiddenError(
      `Lecturers can mark or correct attendance for the last ${LECTURER_EDIT_DAYS} days. Ask an administrator for older dates.`,
    );
  }

  const members = await prisma.student.findMany({
    where: { batchId: input.batchId, id: { in: input.records.map((record) => record.studentId) } },
    select: { id: true },
  });

  if (members.length !== input.records.length) {
    throw new AttendanceConflictError("Some students are no longer in this batch. Refresh and try again.");
  }

  const date = toDate(input.date);

  await prisma.$transaction(
    input.records.map((record) =>
      prisma.attendance.upsert({
        where: {
          batchId_studentId_date: { batchId: input.batchId, studentId: record.studentId, date },
        },
        create: {
          batchId: input.batchId,
          studentId: record.studentId,
          date,
          status: record.status,
          markedById: viewer.userId,
        },
        update: { status: record.status, markedById: viewer.userId },
      }),
    ),
  );

  const present = input.records.filter((record) => record.status === "PRESENT").length;

  return {
    batchName: batch.name,
    present,
    absent: input.records.length - present,
  };
}

// A month's register for one batch: marks per student per day and totals.
export async function getAttendanceMonth(batchId: string, month: string, viewer: Viewer) {
  const batch = await loadBatch(batchId, viewer);
  const start = toDate(`${month}-01`);
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));

  const records = await prisma.attendance.findMany({
    where: { batchId, date: { gte: start, lt: end } },
    select: { studentId: true, date: true, status: true },
  });

  // Current members, plus anyone marked this month who has since moved.
  const studentIds = new Set(records.map((record) => record.studentId));
  const students = await prisma.student.findMany({
    where: { OR: [{ batchId }, { id: { in: [...studentIds] } }] },
    select: { ...studentSelect, batchId: true },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  const days = [...new Set(records.map((record) => record.date.toISOString().slice(0, 10)))].sort();

  return {
    batch,
    month,
    days,
    students: students.map(({ batchId: currentBatch, ...student }) => {
      const marks = Object.fromEntries(
        records
          .filter((record) => record.studentId === student.id)
          .map((record) => [record.date.toISOString().slice(0, 10), record.status]),
      );
      const present = Object.values(marks).filter((status) => status === "PRESENT").length;
      const marked = Object.keys(marks).length;

      return {
        ...student,
        movedOut: currentBatch !== batchId,
        marks,
        present,
        absent: marked - present,
        percent: marked ? Math.round((present / marked) * 100) : null,
      };
    }),
  };
}
