-- Attendance: one Present/Absent mark per student, per batch, per day.
-- Additive only: no existing record is changed.

CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

CREATE TABLE "attendance" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "markedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_batchId_studentId_date_key"
ON "attendance"("batchId", "studentId", "date");
CREATE INDEX "attendance_batchId_date_idx" ON "attendance"("batchId", "date");
CREATE INDEX "attendance_studentId_date_idx" ON "attendance"("studentId", "date");

-- History is kept: batches and students with attendance cannot be deleted.
ALTER TABLE "attendance"
ADD CONSTRAINT "attendance_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "batches"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance"
ADD CONSTRAINT "attendance_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "students"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance"
ADD CONSTRAINT "attendance_markedById_fkey"
FOREIGN KEY ("markedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
