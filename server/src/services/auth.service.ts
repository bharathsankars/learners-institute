import { prisma } from "../config/database.js";

import type { LoginInput } from "../validators/auth.validator.js";

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

  if (user.password !== input.password) {
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
