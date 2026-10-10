import { PaymentError } from "./payment.service.js";
import { prisma } from "../config/database.js";

import type {
  CreateFeePlanInput,
  UpdateFeePlanInput,
} from "../validators/fee.validator.js";

export async function createFeePlan(input: CreateFeePlanInput) {
  return prisma.$transaction(async (transaction) => {
    const enrollment = await transaction.enrollment.create({
      data: {
        studentId: input.studentId,
        courseId: input.courseId,
      },
    });

    return transaction.feePlan.create({
      data: {
        enrollmentId: enrollment.id,

        totalFeePaise: input.totalFeePaise,

        discountPaise: input.discountPaise,

        ...(input.dueDate && {
          dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
        }),

        ...(input.notes && {
          notes: input.notes,
        }),
      },

      include: {
        payments: true,
      enrollment: {
          include: {
            student: true,
            course: true,
          },
        },
      },
    });
  });
}

export async function getFeePlans() {
  return prisma.feePlan.findMany({
    include: {
      payments: true,
      enrollment: {
        include: {
          student: true,
          course: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getFeePlanById(feePlanId: string) {
  return prisma.feePlan.findUnique({
    where: {
      id: feePlanId,
    },

    include: {
      payments: true,
      enrollment: {
        include: {
          student: true,
          course: true,
        },
      },
    },
  });
}

export async function updateFeePlan(
  feePlanId: string,
  input: UpdateFeePlanInput,
) {
  return prisma.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT id FROM fee_plans WHERE id = ${feePlanId}::uuid FOR UPDATE`;
    const collected = await transaction.payment.aggregate({ where: { feePlanId }, _sum: { amountPaise: true } });
    if (input.totalFeePaise - input.discountPaise < (collected._sum.amountPaise ?? 0)) throw new PaymentError("Effective fee cannot be less than payments already collected.");
    return transaction.feePlan.update({
    where: {
      id: feePlanId,
    },

    data: {
      totalFeePaise: input.totalFeePaise,

      discountPaise: input.discountPaise,

      status: input.status,

      ...(input.dueDate !== undefined && {
        dueDate:
          input.dueDate === null
            ? null
            : new Date(`${input.dueDate}T00:00:00.000Z`),
      }),

      ...(input.notes !== undefined && {
        notes: input.notes === null ? null : input.notes.trim() || null,
      }),
    },

    include: {
      payments: true,
      enrollment: {
        include: {
          student: true,
          course: true,
        },
      },
    },
  });
  });
}

export async function cancelFeePlan(feePlanId: string) {
  return prisma.$transaction(async (transaction) => {
    const feePlan = await transaction.feePlan.update({
      where: {
        id: feePlanId,
      },

      data: {
        status: "CANCELLED",
      },

      include: {
        enrollment: true,
      },
    });

    await transaction.enrollment.update({
      where: {
        id: feePlan.enrollmentId,
      },

      data: {
        status: "CANCELLED",
      },
    });

    return feePlan;
  });
}
