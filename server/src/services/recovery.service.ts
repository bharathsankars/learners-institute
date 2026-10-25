import bcrypt from "bcrypt";

import { prisma } from "../config/database.js";

import type {
  CompleteSuperAdminPasswordResetInput,
  CreateTemporaryRecoveryPasswordInput,
  VerifyTemporaryRecoveryPasswordInput,
} from "../validators/recovery.validator.js";

const BCRYPT_ROUNDS = 12;

const RECOVERY_MINUTES = 30;

export async function getRecoverySuperAdmin() {
  return prisma.user.findFirst({
    where: {
      role: "SUPER_ADMIN",
    },

    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      email: true,
      isActive: true,
    },
  });
}

export async function createTemporaryRecoveryPassword(
  recoveryAdminId: string,
  input:
    CreateTemporaryRecoveryPasswordInput,
) {
  const superAdmin =
    await prisma.user.findFirst({
      where: {
        role: "SUPER_ADMIN",
      },

      select: {
        id: true,
      },
    });

  if (!superAdmin) {
    return {
      status:
        "NOT_FOUND" as const,
    };
  }

  const codeHash =
    await bcrypt.hash(
      input.temporaryPassword,
      BCRYPT_ROUNDS,
    );

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        RECOVERY_MINUTES *
          60 *
          1000,
    );

  const [, recoveryCode] =
    await prisma.$transaction([
      /*
       * Creating a new recovery password
       * immediately invalidates all
       * previously issued passwords.
       */
      prisma.superAdminRecoveryCode.updateMany({
        where: {
          superAdminId:
            superAdmin.id,

          usedAt:
            null,
        },

        data: {
          usedAt:
            now,
        },
      }),

      prisma.superAdminRecoveryCode.create({
        data: {
          superAdminId:
            superAdmin.id,

          createdById:
            recoveryAdminId,

          codeHash,

          expiresAt,
        },

        select: {
          id: true,
          expiresAt: true,
        },
      }),
    ]);

  return {
    status:
      "CREATED" as const,

    recoveryCode,
  };
}

async function findMatchingRecoveryCode(
  temporaryPassword: string,
) {
  const superAdmin =
    await prisma.user.findFirst({
      where: {
        role:
          "SUPER_ADMIN",
      },

      select: {
        id: true,
      },
    });

  if (!superAdmin) {
    return null;
  }

  const recoveryCode =
    await prisma.superAdminRecoveryCode.findFirst({
      where: {
        superAdminId:
          superAdmin.id,

        usedAt:
          null,

        expiresAt: {
          gt:
            new Date(),
        },
      },

      orderBy: {
        createdAt:
          "desc",
      },
    });

  if (!recoveryCode) {
    return null;
  }

  const matches =
    await bcrypt.compare(
      temporaryPassword,
      recoveryCode.codeHash,
    );

  if (!matches) {
    return null;
  }

  return {
    superAdmin,
    recoveryCode,
  };
}

export async function verifyTemporaryRecoveryPassword(
  input:
    VerifyTemporaryRecoveryPasswordInput,
) {
  const match =
    await findMatchingRecoveryCode(
      input.temporaryPassword,
    );

  if (!match) {
    return {
      status:
        "INVALID" as const,
    };
  }

  return {
    status:
      "VALID" as const,

    expiresAt:
      match.recoveryCode.expiresAt,
  };
}

export async function completeSuperAdminPasswordReset(
  input:
    CompleteSuperAdminPasswordResetInput,
) {
  const match =
    await findMatchingRecoveryCode(
      input.temporaryPassword,
    );

  if (!match) {
    return {
      status:
        "INVALID" as const,
    };
  }

  const passwordHash =
    await bcrypt.hash(
      input.newPassword,
      BCRYPT_ROUNDS,
    );

  const now =
    new Date();

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id:
          match.superAdmin.id,
      },

      data: {
        password:
          passwordHash,

        isActive:
          true,
      },
    }),

    /*
     * Sign out all existing
     * Super Admin sessions.
     */
    prisma.session.deleteMany({
      where: {
        userId:
          match.superAdmin.id,
      },
    }),

    /*
     * The recovery password is
     * one-time use. Invalidate all
     * outstanding recovery codes.
     */
    prisma.superAdminRecoveryCode.updateMany({
      where: {
        superAdminId:
          match.superAdmin.id,

        usedAt:
          null,
      },

      data: {
        usedAt:
          now,
      },
    }),
  ]);

  return {
    status:
      "UPDATED" as const,
  };
}
