import type { Response } from "express";

import { prisma } from "../config/database.js";

export type ActivityEntry = {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
};

// Recorded after the change has succeeded. A logging failure is reported but
// never turns a successful save into an error for the user.
export async function recordActivity(actorId: string | null, entry: ActivityEntry) {
  try {
    await prisma.activityLog.create({
      data: {
        actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        summary: entry.summary.slice(0, 500),
      },
    });
  } catch (error) {
    console.error("Failed to record activity:", error);
  }
}

// Controller shorthand: the signed-in user is the actor. The entry is built
// inside the guard too, so a missing field in a summary can never fail a
// change that has already been saved.
export async function logActivity(res: Response, build: () => ActivityEntry): Promise<void> {
  let entry: ActivityEntry;

  try {
    entry = build();
  } catch (error) {
    console.error("Failed to describe activity:", error);
    return;
  }

  await recordActivity(res.locals?.userId ?? null, entry);
}

export const ACTIVITY_PAGE_SIZE = 50;

export async function getActivity(options: { entityType?: string | undefined; before?: Date | undefined }) {
  const entries = await prisma.activityLog.findMany({
    where: {
      ...(options.entityType && { entityType: options.entityType }),
      ...(options.before && { createdAt: { lt: options.before } }),
    },
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      summary: true,
      createdAt: true,
      actor: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_PAGE_SIZE + 1,
  });

  return {
    entries: entries.slice(0, ACTIVITY_PAGE_SIZE),
    hasMore: entries.length > ACTIVITY_PAGE_SIZE,
  };
}
