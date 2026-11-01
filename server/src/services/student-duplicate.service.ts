import type { Prisma } from "../../generated/prisma/client.js";

/*
 * One duplicate rule for every registration path (manual, enquiry
 * admission, Excel import):
 *
 *   same normalized full name AND (same phone OR same email)
 *
 * A shared phone or email on its own is not a duplicate, so siblings
 * registered with a parent's contact details are accepted.
 */

type Db = Prisma.TransactionClient;

export type StudentIdentity = {
  firstName: string;
  lastName?: string | null | undefined;
  phone: string;
  email?: string | null | undefined;
};

export function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

// Compare the trailing ten digits so "+91 94461 25964" matches "9446125964".
export function normalizePhone(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export function normalizeEmail(value?: string | null): string {
  return value ? value.trim().toLocaleLowerCase("en") : "";
}

/** Keys under which two records are considered the same student. */
export function duplicateKeys(student: StudentIdentity): string[] {
  const name = normalizeName(
    [student.firstName, student.lastName].filter(Boolean).join(" "),
  );
  const email = normalizeEmail(student.email);

  return [
    `${name}|phone:${normalizePhone(student.phone)}`,
    ...(email ? [`${name}|email:${email}`] : []),
  ];
}

export class StudentDuplicateError extends Error {
  constructor(public admissionNumber: string) {
    super(
      `This student appears to be already registered as ${admissionNumber} (same name and phone or email).`,
    );
  }
}

/**
 * Serializes all student registration. Every student insert allocates
 * its LIT number by updating this row, so holding it first guarantees
 * duplicate checks see every committed student. Must run inside an
 * interactive transaction.
 */
export async function lockStudentRegistration(tx: Db): Promise<void> {
  // Fail fast rather than queueing indefinitely behind another writer.
  await tx.$executeRaw`SET LOCAL lock_timeout = '15s'`;
  await tx.$queryRaw`SELECT "lastNumber" FROM student_admission_counter WHERE id = 1 FOR UPDATE`;
}

/** Returns the admission number of an existing duplicate, if any. */
export async function findDuplicateStudent(
  tx: Db,
  student: StudentIdentity,
): Promise<string | null> {
  const phone = normalizePhone(student.phone);
  const email = normalizeEmail(student.email);

  // Narrow by contact details in SQL, then apply the exact name rule here.
  const candidates = await tx.$queryRaw<(StudentIdentity & { admissionNumber: string })[]>`
    SELECT "admissionNumber", "firstName", "lastName", phone, email
    FROM students
    WHERE right(regexp_replace(phone, '\\D', '', 'g'), 10) = ${phone}
       OR (${email} <> '' AND lower(trim(email)) = ${email})`;

  const wanted = new Set(duplicateKeys(student));
  const match = candidates.find((candidate) =>
    duplicateKeys(candidate).some((key) => wanted.has(key)),
  );

  return match?.admissionNumber ?? null;
}
