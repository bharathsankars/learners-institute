-- Records each confirmed Excel student import.
-- Additive only: no existing table or record is changed.
-- "requestId" makes retries of the same confirmation idempotent;
-- "fileSha256" lets a re-upload of an imported workbook be refused.
CREATE TABLE "student_import_batches" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "fileSha256" CHAR(64) NOT NULL,
    "studentCount" INTEGER NOT NULL CHECK ("studentCount" > 0),
    "importedById" UUID,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_import_batches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "student_import_batches_requestId_key"
ON "student_import_batches"("requestId");

CREATE INDEX "student_import_batches_fileSha256_idx"
ON "student_import_batches"("fileSha256");

ALTER TABLE "student_import_batches"
ADD CONSTRAINT "student_import_batches_importedById_fkey"
FOREIGN KEY ("importedById") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
