-- Preserve admission numbers longer than three digits.
-- Existing student records and counter values remain unchanged.
CREATE OR REPLACE FUNCTION next_lit_admission_number()
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

    RETURN 'LIT' || LPAD(
        allocated_number::TEXT,
        GREATEST(3, LENGTH(allocated_number::TEXT)),
        '0'
    );
END;
$$;
