import bcrypt from "bcrypt";

import { prisma } from "../config/database.js";

import type { LoginInput } from "../validators/auth.validator.js";

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

  // Accept only bcrypt-hashed passwords.
  if (!isBcryptHash(user.password)) {
    return null;
  }

  const passwordMatches = await bcrypt.compare(
    input.password,
    user.password,
  );

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
