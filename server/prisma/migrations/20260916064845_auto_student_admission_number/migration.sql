-- Create a sequence for automatic student admission numbers
CREATE SEQUENCE student_admission_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Tie the sequence lifecycle to the admission number column
ALTER SEQUENCE student_admission_number_seq
OWNED BY "students"."admissionNumber";

-- Generate values such as L-001, L-002, L-003...
ALTER TABLE "students"
ALTER COLUMN "admissionNumber"
SET DEFAULT (
    'L-' || LPAD(
        nextval('student_admission_number_seq')::text,
        3,
        '0'
    )
);