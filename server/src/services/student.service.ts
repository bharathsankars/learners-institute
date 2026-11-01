import { prisma } from "../config/database.js";
import {
  findDuplicateStudent,
  lockStudentRegistration,
  StudentDuplicateError,
} from "./student-duplicate.service.js";

import type {
  CreateStudentInput,
  UpdateStudentInput,
} from "../validators/student.validator.js";

export async function createStudent(input: CreateStudentInput) {
  return prisma.$transaction(async (tx) => {
    await lockStudentRegistration(tx);

    const duplicate = await findDuplicateStudent(tx, input);
    if (duplicate) throw new StudentDuplicateError(duplicate);

    return tx.student.create({
      data: {
        firstName: input.firstName,
        phone: input.phone,

        ...(input.lastName && {
          lastName: input.lastName,
        }),

        ...(input.email && {
          email: input.email.toLowerCase(),
        }),

        ...(input.dateOfBirth && {
          dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
        }),

        ...(input.gender && {
          gender: input.gender,
        }),

        ...(input.address && {
          address: input.address,
        }),
      },
    });
  });
}

export async function getStudents() {
  return prisma.student.findMany({
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput,
) {
  return prisma.student.update({
    where: {
      id: studentId,
    },

    data: {
      firstName: input.firstName,
      phone: input.phone,
      status: input.status,

      lastName: input.lastName ?? null,

      email: input.email ? input.email.toLowerCase() : null,

      dateOfBirth: input.dateOfBirth
        ? new Date(`${input.dateOfBirth}T00:00:00.000Z`)
        : null,

      gender: input.gender ?? null,

      address: input.address ?? null,
    },
  });
}
