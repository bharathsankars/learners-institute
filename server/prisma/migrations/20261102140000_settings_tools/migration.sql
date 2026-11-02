-- Settings tools: last sign-in time for users and an activity log.
-- Additive only: no existing record is changed.

ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMPTZ(3);

CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");
CREATE INDEX "activity_logs_entityType_idx" ON "activity_logs"("entityType");
CREATE INDEX "activity_logs_actorId_idx" ON "activity_logs"("actorId");

-- Deleting a user keeps their history, shown as a removed user.
ALTER TABLE "activity_logs"
ADD CONSTRAINT "activity_logs_actorId_fkey"
FOREIGN KEY ("actorId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
