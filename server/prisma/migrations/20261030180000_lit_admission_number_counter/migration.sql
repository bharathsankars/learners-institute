-- Transactional admission number allocation.
-- Existing student admission numbers are preserved.

-- Block concurrent student writes while installing the new allocator.
-- PostgreSQL releases this lock when the migration transaction ends.
LOCK TABLE "students" IN ACCESS EXCLUSIVE MODE;

CREATE TABLE "student_admission_counter" (
    "id" INTEGER PRIMARY KEY CHECK ("id" = 1),
    "lastNumber" BIGINT NOT NULL CHECK ("lastNumber" >= 0)
);

-- Begin after the largest existing LIT number.
INSERT INTO "student_admission_counter" ("id", "lastNumber")
SELECT
    1,
    COALESCE(
        MAX(SUBSTRING("admissionNumber" FROM 4)::BIGINT),
        0
    )
FROM "students"
WHERE "admissionNumber" ~ '^LIT[0-9]+$';

CREATE FUNCTION next_lit_admission_number()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
    allocated_number BIGINT;
BEGIN
    UPDATE "student_admission_counter"
    SET "lastNumber" = "lastNumber" + 1
    WHERE "id" = 1
    RETURNING "lastNumber" INTO allocated_number;

    IF allocated_number IS NULL THEN
        RAISE EXCEPTION 'Admission number counter is missing';
    END IF;

    RETURN 'LIT' || LPAD(allocated_number::TEXT, 3, '0');
END;
$$;

ALTER TABLE "students"
ALTER COLUMN "admissionNumber"
SET DEFAULT next_lit_admission_number();

-- Prevent changes to admission numbers after registration.
CREATE FUNCTION protect_student_admission_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW."admissionNumber" IS DISTINCT FROM OLD."admissionNumber" THEN
        RAISE EXCEPTION 'Student admission numbers cannot be changed';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER protect_student_admission_number_trigger
BEFORE UPDATE OF "admissionNumber"
ON "students"
FOR EACH ROW
EXECUTE FUNCTION protect_student_admission_number();
