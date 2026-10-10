import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

import { prisma } from "../config/database.js";
import { env } from "../config/env.js";

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function startSession(
  userId: string,
  res: Response,
): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const maxAge = 8 * 60 * 60 * 1000;

  await prisma.session.create({
    data: {
      tokenHash: hash(token),
      userId,
      expiresAt: new Date(Date.now() + maxAge),
    },
  });

  res.cookie("session", token, {
    ...cookieOptions,
    maxAge,
  });
}

export async function endSession(
  req: Request,
  res: Response,
): Promise<void> {
  const token = req.cookies?.session;

  if (typeof token === "string") {
    await prisma.session.deleteMany({
      where: {
        tokenHash: hash(token),
      },
    });
  }

  res.clearCookie("session", cookieOptions);
}

export async function getSessionUser(req: Request) {
  const token = req.cookies?.session;

  if (typeof token !== "string") {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hash(token),
    },
    include: {
      user: true,
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt <= new Date()) {
    return null;
  }

  if (!session.user.isActive) {
    return null;
  }

  return session.user;
}

async function checkSession(
  req: Request,
  res: Response,
  next: NextFunction,
  superAdminOnly: boolean,
): Promise<void> {
  try {
    const user = await getSessionUser(req);

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Please sign in again.",
      });

      return;
    }

    if (
      superAdminOnly &&
      user.role !== "SUPER_ADMIN"
    ) {
      res.status(403).json({
        success: false,
        message: "Super Admin access is required.",
      });

      return;
    }

    next();
  } catch (error) {
    next(error);
  }
}

export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
) => checkSession(req, res, next, true);

export const requireAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction,
) => checkSession(req, res, next, false);
