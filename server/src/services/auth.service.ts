import bcrypt from "bcrypt";

import { prisma } from "../config/database.js";

import type { LoginInput } from "../validators/auth.validator.js";

const BCRYPT_ROUNDS = 12;

function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$/.test(value);
}

export async function authenticateUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      username: input.username,
    },
  });

  if (!user) {
    return null;
  }

  if (!user.isActive) {
    return null;
  }

  let passwordMatches = false;

  if (isBcryptHash(user.password)) {
    passwordMatches = await bcrypt.compare(
      input.password,
      user.password,
    );
  } else {
    passwordMatches = user.password === input.password;

    if (passwordMatches) {
      const passwordHash = await bcrypt.hash(
        input.password,
        BCRYPT_ROUNDS,
      );

      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          password: passwordHash,
        },
      });
    }
  }

  if (!passwordMatches) {
    return null;
  }

  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}
