import bcrypt from "bcrypt";

import { prisma } from "../config/database.js";

import type {
  ChangeOwnPasswordInput,
  CreateAdminUserInput,
  UpdateAdminUserInput,
} from "../validators/admin-user.validator.js";

const BCRYPT_ROUNDS = 12;

const publicUserSelect = {
  id: true,
  firstName: true,
  lastName: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getAdminUsers() {
  return prisma.user.findMany({
    where: {
      role: {
        in: [
          "SUPER_ADMIN",
          "ADMIN",
          "STAFF",
        ],
      },
    },

    select:
      publicUserSelect,

    orderBy: [
      {
        role: "asc",
      },
      {
        firstName: "asc",
      },
    ],
  });
}

export async function createAdminUser(
  input:
    CreateAdminUserInput,
) {
  const passwordHash =
    await bcrypt.hash(
      input.password,
      BCRYPT_ROUNDS,
    );

  return prisma.user.create({
    data: {
      firstName:
        input.firstName.trim(),

      lastName:
        input.lastName.trim(),

      username:
        input.username.trim(),

      email:
        input.email.trim(),

      password:
        passwordHash,

      role:
        input.role,

      isActive: true,
    },

    select:
      publicUserSelect,
  });
}

export async function updateAdminUser(
  userId: string,

  input:
    UpdateAdminUserInput,
) {
  const existing =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        role: true,
      },
    });

  if (!existing) {
    return {
      status:
        "NOT_FOUND" as const,
    };
  }

  // SUPER_ADMIN is protected.
  if (
    existing.role ===
    "SUPER_ADMIN"
  ) {
    return {
      status:
        "PROTECTED" as const,
    };
  }

  const data: {
    firstName?: string;
    lastName?: string;
    username?: string;
    email?: string;
    password?: string;
    role?:
      | "ADMIN"
      | "STAFF";
    isActive?: boolean;
  } = {};

  if (
    input.firstName !==
    undefined
  ) {
    data.firstName =
      input.firstName.trim();
  }

  if (
    input.lastName !==
    undefined
  ) {
    data.lastName =
      input.lastName.trim();
  }

  if (
    input.username !==
    undefined
  ) {
    data.username =
      input.username.trim();
  }

  if (
    input.email !==
    undefined
  ) {
    data.email =
      input.email.trim();
  }

  if (
    input.role !==
    undefined
  ) {
    data.role =
      input.role;
  }

  if (
    input.isActive !==
    undefined
  ) {
    data.isActive =
      input.isActive;
  }

  if (
    input.password !==
    undefined
  ) {
    data.password =
      await bcrypt.hash(
        input.password,
        BCRYPT_ROUNDS,
      );
  }

  const user =
    await prisma.user.update({
      where: {
        id: userId,
      },

      data,

      select:
        publicUserSelect,
    });

  /*
   * Immediately invalidate existing
   * sessions when security-sensitive
   * account properties change.
   */
  if (
    input.password !==
      undefined ||
    input.role !==
      undefined ||
    input.isActive ===
      false
  ) {
    await prisma.session.deleteMany({
      where: {
        userId,
      },
    });
  }

  return {
    status:
      "UPDATED" as const,

    user,
  };
}

export async function changeOwnPassword(
  userId: string,
  input: ChangeOwnPasswordInput,
) {
  const existing =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        role: true,
        password: true,
      },
    });

  if (!existing) {
    return {
      status:
        "NOT_FOUND" as const,
    };
  }

  if (
    existing.role !==
    "SUPER_ADMIN"
  ) {
    return {
      status:
        "FORBIDDEN" as const,
    };
  }

  const isBcryptPassword =
    /^\$2[aby]\$\d{2}\$/.test(
      existing.password,
    );

  const passwordMatches =
    isBcryptPassword
      ? await bcrypt.compare(
          input.currentPassword,
          existing.password,
        )
      : existing.password ===
        input.currentPassword;

  if (!passwordMatches) {
    return {
      status:
        "INVALID_PASSWORD" as const,
    };
  }

  const passwordHash =
    await bcrypt.hash(
      input.newPassword,
      BCRYPT_ROUNDS,
    );

  await prisma.$transaction([
    prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        password:
          passwordHash,
      },
    }),

    /*
     * Password changes are
     * security-sensitive.
     *
     * Sign out every existing
     * session, including the
     * current browser session.
     */
    prisma.session.deleteMany({
      where: {
        userId,
      },
    }),
  ]);

  return {
    status:
      "UPDATED" as const,
  };
}


export async function deleteAdminUser(
  userId: string,
) {
  const existing =
    await prisma.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
        role: true,
      },
    });

  if (!existing) {
    return {
      status:
        "NOT_FOUND" as const,
    };
  }

  // SUPER_ADMIN can never be
  // deleted through this API.
  if (
    existing.role ===
    "SUPER_ADMIN"
  ) {
    return {
      status:
        "PROTECTED" as const,
    };
  }

  await prisma.user.delete({
    where: {
      id: userId,
    },
  });

  return {
    status:
      "DELETED" as const,
  };
}
