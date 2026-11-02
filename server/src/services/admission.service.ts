import { prisma } from "../config/database.js";

import { reserveBatchSeat } from "./batch.service.js";
import {
  findDuplicateStudent,
  lockStudentRegistration,
  StudentDuplicateError,
} from "./student-duplicate.service.js";

import type { AdmissionInput } from "../validators/admission.validator.js";

export class AdmissionNotFoundError extends Error {}
export class AdmissionConflictError extends Error {}
export class AdmissionForbiddenError extends Error {}

const admissionSelect = {
  id: true,
  admissionNumber: true,
  firstName: true,
  lastName: true,
  phone: true,
  status: true,
  createdAt: true,
  admissionSource: true,
  admittedBy: {
    select: { id: true, firstName: true, lastName: true },
  },
  batch: {
    select: { id: true, name: true, startMinutes: true, endMinutes: true },
  },
  enrollments: {
    select: {
      id: true,
      status: true,
      course: { select: { id: true, title: true } },
    },
    orderBy: { enrolledAt: "asc" },
  },
} as const;

type Actor = { userId: string | null; role: string | null };

// Everything is created in one transaction: if the batch is full, a course
// is inactive or the student is a duplicate, nothing is saved.
export async function createAdmission(input: AdmissionInput, actor: Actor) {
  // Fees live in the Super Admin area, so only a Super Admin may set them here.
  if (input.fees.length > 0 && actor.role !== "SUPER_ADMIN") {
    throw new AdmissionForbiddenError("Only a Super Admin can set fees during admission.");
  }

  return prisma.$transaction(async (tx) => {
    if (input.enquiryId) {
      // Lock the enquiry so a double click cannot admit it twice.
      await tx.$queryRaw`SELECT "id" FROM "enquiries" WHERE "id" = ${input.enquiryId}::uuid FOR UPDATE`;

      const enquiry = await tx.enquiry.findUnique({
        where: { id: input.enquiryId },
        select: { studentId: true },
      });

      if (!enquiry) {
        throw new AdmissionNotFoundError("Enquiry not found.");
      }

      if (enquiry.studentId) {
        throw new AdmissionConflictError("This enquiry has already been admitted.");
      }
    }

    await lockStudentRegistration(tx);

    const duplicate = await findDuplicateStudent(tx, input.student);

    if (duplicate) {
      throw new StudentDuplicateError(duplicate);
    }

    const courses = await tx.course.findMany({
      where: { id: { in: input.courseIds } },
      select: { id: true, title: true, isActive: true },
    });

    if (courses.length !== input.courseIds.length) {
      throw new AdmissionNotFoundError("One of the chosen courses no longer exists.");
    }

    const inactive = courses.find((course) => !course.isActive);

    if (inactive) {
      throw new AdmissionConflictError(`${inactive.title} is inactive and cannot be assigned.`);
    }

    if (input.batchId) {
      await reserveBatchSeat(tx, input.batchId);
    }

    const { student } = input;

    const created = await tx.student.create({
      data: {
        firstName: student.firstName,
        lastName: student.lastName ?? null,
        phone: student.phone,
        email: student.email?.toLowerCase() ?? null,
        dateOfBirth: student.dateOfBirth
          ? new Date(`${student.dateOfBirth}T00:00:00.000Z`)
          : null,
        gender: student.gender ?? null,
        address: student.address ?? null,
        batchId: input.batchId,
        admissionSource: input.enquiryId ? "ENQUIRY" : "WALK_IN",
        admittedById: actor.userId,
      },
      select: { id: true },
    });

    const enrollments = await tx.enrollment.createManyAndReturn({
      data: input.courseIds.map((courseId) => ({
        studentId: created.id,
        courseId,
      })),
      select: { id: true, courseId: true },
    });

    const enrollmentByCourse = new Map(
      enrollments.map((enrollment) => [enrollment.courseId, enrollment.id]),
    );

    for (const fee of input.fees) {
      await tx.feePlan.create({
        data: {
          enrollmentId: enrollmentByCourse.get(fee.courseId)!,
          totalFeePaise: fee.totalFeePaise,
          discountPaise: fee.discountPaise,
          ...(fee.dueDate && {
            dueDate: new Date(`${fee.dueDate}T00:00:00.000Z`),
          }),
        },
      });
    }

    if (input.enquiryId) {
      await tx.enquiry.update({
        where: { id: input.enquiryId },
        data: { studentId: created.id, status: "CLOSED" },
      });
    }

    return tx.student.findUniqueOrThrow({
      where: { id: created.id },
      select: admissionSelect,
    });
  });
}
