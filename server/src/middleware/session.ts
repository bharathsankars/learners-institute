import { createHash, randomBytes } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";

const cookieOptions = { httpOnly: true, secure: env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export async function startSession(userId: string, res: Response) {
  const token = randomBytes(32).toString("hex");
  const maxAge = 8 * 60 * 60 * 1000;
  await prisma.session.create({ data: { tokenHash: hash(token), userId, expiresAt: new Date(Date.now() + maxAge) } });
  res.cookie("session", token, { ...cookieOptions, maxAge });
}
export async function endSession(req: Request, res: Response) {
  const token = req.cookies?.session;
  if (typeof token === "string") await prisma.session.deleteMany({ where: { tokenHash: hash(token) } });
  res.clearCookie("session", cookieOptions);
}
async function checkSession(req: Request, res: Response, next: NextFunction, superAdminOnly: boolean) {
  try {
    const token = req.cookies?.session;
    const session = typeof token === "string" ? await prisma.session.findUnique({ where: { tokenHash: hash(token) }, include: { user: true } }) : null;
    if (!session || session.expiresAt <= new Date() || !session.user.isActive) {
      res.status(401).json({ success: false, message: "Please sign in again." }); return;
    }
    if (superAdminOnly && session.user.role !== "SUPER_ADMIN") {
      res.status(403).json({ success: false, message: "Super Admin access is required." }); return;
    }
    next();
  } catch (error) { next(error); }
}
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => checkSession(req, res, next, true);
export const requireAuthenticated = (req: Request, res: Response, next: NextFunction) => checkSession(req, res, next, false);
