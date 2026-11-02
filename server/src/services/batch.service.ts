import { prisma } from "../config/database.js";

import type { BatchInput } from "../validators/batch.validator.js";

export class BatchNotFoundError extends Error {}
export class BatchConflictError extends Error {}

const batchSelect = {
  id: true,
  name: true,
  days: true,
  startMinutes: true,
  endMinutes: true,
  capacity: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  instructor: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  _count: {
    select: {
      students: true,
    },
  },
} as const;

type BatchRecord = {
  _count: { students: number };
} & Record<string, unknown>;

function toBatch<T extends BatchRecord>({ _count, ...batch }: T) {
  return {
    ...batch,
    studentCount: _count.students,
  };
}

// Batches are taught by people who can sign in; the recovery account cannot.
async function assertInstructor(instructorId: string | null) {
  if (!instructorId) {
    return;
  }

  const instructor = await prisma.user.findUnique({
    where: { id: instructorId },
    select: { isActive: true, role: true },
  });

  if (!instructor || !instructor.isActive || instructor.role === "RECOVERY_ADMIN") {
    throw new BatchConflictError("Choose an active staff member as the instructor.");
  }
}

function batchData(input: BatchInput) {
  return {
    name: input.name,
    days: input.days,
    startMinutes: input.startTime,
    endMinutes: input.endTime,
    capacity: input.capacity,
    instructorId: input.instructorId,
    isActive: input.isActive,
  };
}

export async function getBatches() {
  const batches = await prisma.batch.findMany({
    select: batchSelect,
    orderBy: [
      { isActive: "desc" },
      { startMinutes: "asc" },
      { name: "asc" },
    ],
  });

  return batches.map(toBatch);
}

export async function getBatchInstructors() {
  return prisma.user.findMany({
    where: {
      isActive: true,
      role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      role: true,
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

export async function createBatch(input: BatchInput) {
  await assertInstructor(input.instructorId);

  const batch = await prisma.batch.create({
    data: batchData(input),
    select: batchSelect,
  });

  return toBatch(batch);
}

export async function updateBatch(batchId: string, input: BatchInput) {
  await assertInstructor(input.instructorId);

  const current = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { _count: { select: { students: true } } },
  });

  if (!current) {
    throw new BatchNotFoundError("Batch not found.");
  }

  if (input.capacity < current._count.students) {
    throw new BatchConflictError(
      `This batch has ${current._count.students} students, so capacity cannot be lower than that.`,
    );
  }

  const batch = await prisma.batch.update({
    where: { id: batchId },
    data: batchData(input),
    select: batchSelect,
  });

  return toBatch(batch);
}

export async function deleteBatch(batchId: string) {
  const [studentCount, attendanceCount] = await Promise.all([
    prisma.student.count({ where: { batchId } }),
    prisma.attendance.count({ where: { batchId } }),
  ]);

  if (studentCount > 0) {
    throw new BatchConflictError(
      "Move or remove the students in this batch before deleting it. To keep it for records, archive it instead.",
    );
  }

  if (attendanceCount > 0) {
    throw new BatchConflictError(
      "This batch has attendance history, so it cannot be deleted. Archive it instead to keep the records.",
    );
  }

  return prisma.batch.delete({
    where: { id: batchId },
    select: { name: true },
  });
}

const batchStudentSelect = {
  id: true,
  admissionNumber: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  enrollments: {
    where: { status: "ACTIVE" },
    select: {
      course: {
        select: {
          id: true,
          title: true,
        },
      },
    },
    orderBy: { enrolledAt: "asc" },
  },
} as const;

export class BatchForbiddenError extends Error {}

// A lecturer (STAFF) may only open batches they teach.
export async function getBatchStudents(
  batchId: string,
  viewer: { userId: string | null; role: string | null } = { userId: null, role: null },
) {
  const batch = await prisma.batch.findUnique({
    where: { id: batchId },
    select: { id: true, instructorId: true },
  });

  if (!batch) {
    return null;
  }

  if (viewer.role === "STAFF" && batch.instructorId !== viewer.userId) {
    throw new BatchForbiddenError("You can only open the batches you teach.");
  }

  return prisma.student.findMany({
    where: { batchId },
    select: batchStudentSelect,
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });
}

type Transaction = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Locks the batch row and checks it can take one more student, so two people
// filling the last seat at once cannot both succeed. Used by batch assignment
// and by one-step admission.
export async function reserveBatchSeat(tx: Transaction, batchId: string): Promise<{ name: string }> {
  await tx.$queryRaw`SELECT "id" FROM "batches" WHERE "id" = ${batchId}::uuid FOR UPDATE`;

  const batch = await tx.batch.findUnique({
    where: { id: batchId },
    select: {
      name: true,
      capacity: true,
      isActive: true,
      _count: { select: { students: true } },
    },
  });

  if (!batch) {
    throw new BatchNotFoundError("Batch not found.");
  }

  if (!batch.isActive) {
    throw new BatchConflictError("Archived batches cannot take new students.");
  }

  if (batch._count.students >= batch.capacity) {
    throw new BatchConflictError(
      `${batch.name} is full (${batch.capacity} of ${batch.capacity} seats).`,
    );
  }

  return { name: batch.name };
}

// Assigning moves the student out of any previous batch, because a student
// sits in one batch at a time.
export async function assignBatchStudent(batchId: string, studentId: string) {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: { status: true, batchId: true },
    });

    if (!student) {
      throw new BatchNotFoundError("Student not found.");
    }

    if (student.batchId === batchId) {
      throw new BatchConflictError("This student is already in this batch.");
    }

    const batch = await reserveBatchSeat(tx, batchId);

    if (student.status !== "ACTIVE") {
      throw new BatchConflictError("Only active students can be assigned to a batch.");
    }

    const updated = await tx.student.update({
      where: { id: studentId },
      data: { batchId },
      select: batchStudentSelect,
    });

    return { student: updated, batchName: batch.name };
  });
}

export async function removeBatchStudent(batchId: string, studentId: string) {
  const member = await prisma.student.findFirst({
    where: { id: studentId, batchId },
    select: { firstName: true, lastName: true, batch: { select: { name: true } } },
  });

  if (!member) {
    throw new BatchNotFoundError("This student is not in this batch.");
  }

  const result = await prisma.student.updateMany({
    where: { id: studentId, batchId },
    data: { batchId: null },
  });

  if (result.count === 0) {
    throw new BatchNotFoundError("This student is not in this batch.");
  }

  return {
    studentName: [member.firstName, member.lastName].filter(Boolean).join(" "),
    batchName: member.batch?.name ?? "the batch",
  };
}
