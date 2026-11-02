-- Class batches: time slots that students of any course can share.
-- Additive only: adds the "batches" table and a nullable "students"."batchId";
-- no existing record is changed.

CREATE TYPE "Weekday" AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');

CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "days" "Weekday"[] NOT NULL CHECK (cardinality("days") > 0),
    "startMinutes" INTEGER NOT NULL CHECK ("startMinutes" BETWEEN 0 AND 1439),
    "endMinutes" INTEGER NOT NULL CHECK ("endMinutes" BETWEEN 1 AND 1440),
    "capacity" INTEGER NOT NULL CHECK ("capacity" BETWEEN 1 AND 500),
    "instructorId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "batches_time_order" CHECK ("endMinutes" > "startMinutes")
);

CREATE UNIQUE INDEX "batches_name_key" ON "batches"("name");
CREATE INDEX "batches_isActive_idx" ON "batches"("isActive");
CREATE INDEX "batches_instructorId_idx" ON "batches"("instructorId");

ALTER TABLE "batches"
ADD CONSTRAINT "batches_instructorId_fkey"
FOREIGN KEY ("instructorId") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- A batch cannot be deleted while students are still assigned to it.
ALTER TABLE "students" ADD COLUMN "batchId" UUID;

CREATE INDEX "students_batchId_idx" ON "students"("batchId");

ALTER TABLE "students"
ADD CONSTRAINT "students_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
