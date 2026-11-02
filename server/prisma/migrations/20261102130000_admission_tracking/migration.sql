-- Records how each student was admitted and by whom.
-- Additive: two nullable columns on "students". Existing students keep
-- every value they have; the only backfill marks students already linked
-- to a website enquiry as admitted from that enquiry.

CREATE TYPE "AdmissionSource" AS ENUM ('WALK_IN', 'ENQUIRY', 'IMPORT');

ALTER TABLE "students"
ADD COLUMN "admissionSource" "AdmissionSource",
ADD COLUMN "admittedById" UUID;

ALTER TABLE "students"
ADD CONSTRAINT "students_admittedById_fkey"
FOREIGN KEY ("admittedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- The Admissions page lists students newest first.
CREATE INDEX "students_createdAt_idx" ON "students"("createdAt");

UPDATE "students"
SET "admissionSource" = 'ENQUIRY'
WHERE "id" IN (
    SELECT "studentId" FROM "enquiries" WHERE "studentId" IS NOT NULL
);
