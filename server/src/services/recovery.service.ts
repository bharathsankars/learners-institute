import bcrypt from "bcrypt";
import { randomBytes } from "node:crypto";

import { prisma } from "../config/database.js";

import type {
  CompleteSuperAdminPasswordResetInput,
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
) {
  const superAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
    select: { id: true },
  });

  if (!superAdmin) {
    return { status: "NOT_FOUND" as const };
  }

  // Generate a cryptographically secure temporary password.
  const temporaryPassword =
    "LNR-" + randomBytes(18).toString("hex").toUpperCase();

  const codeHash = await bcrypt.hash(
    temporaryPassword,
    BCRYPT_ROUNDS,
  );

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() + RECOVERY_MINUTES * 60 * 1000,
  );

  const recoveryCode = await prisma.$transaction(
    async (tx) => {
      // Invalidate previously issued recovery codes.
      await tx.superAdminRecoveryCode.updateMany({
        where: {
          superAdminId: superAdmin.id,
          usedAt: null,
        },
        data: { usedAt: now },
      });

      return tx.superAdminRecoveryCode.create({
        data: {
          superAdminId: superAdmin.id,
          createdById: recoveryAdminId,
          codeHash,
          expiresAt,
        },
        select: {
          id: true,
          expiresAt: true,
        },
      });
    },
    { isolationLevel: "Serializable" },
  );

  return {
    status: "CREATED" as const,
    recoveryCode,
    temporaryPassword,
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
  input: CompleteSuperAdminPasswordResetInput,
) {
  const match = await findMatchingRecoveryCode(input.temporaryPassword);

  if (!match) {
    return { status: "INVALID" as const };
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  const now = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const claim = await tx.superAdminRecoveryCode.updateMany({
        where: {
          id: match.recoveryCode.id,
          superAdminId: match.superAdmin.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (claim.count !== 1) {
        throw new Error("RECOVERY_CODE_ALREADY_USED");
      }

      await tx.user.update({
        where: { id: match.superAdmin.id },
        data: {
          password: passwordHash,
          isActive: true,
        },
      });

      await tx.session.deleteMany({
        where: { userId: match.superAdmin.id },
      });

      await tx.superAdminRecoveryCode.updateMany({
        where: {
          superAdminId: match.superAdmin.id,
          usedAt: null,
        },
        data: { usedAt: now },
      });
    }, {
      isolationLevel: "Serializable",
    });

    return { status: "UPDATED" as const };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "RECOVERY_CODE_ALREADY_USED"
    ) {
      return { status: "INVALID" as const };
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2034"
    ) {
      return { status: "INVALID" as const };
    }

    throw error;
  }
}
