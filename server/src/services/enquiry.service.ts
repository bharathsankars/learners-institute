import { prisma } from "../config/database.js";
import type { CreateStudentInput } from "../validators/student.validator.js";
import type { CreateEnquiryInput } from "../validators/enquiry.validator.js";

export async function createEnquiry(input: CreateEnquiryInput) {
  // A retry of the same submission must not create a second enquiry.
  const enquiry = await prisma.enquiry.upsert({
    where: { requestId: input.requestId },
    update: {},
    create: {
      ...input,
      email: input.email || null,
      message: input.message || null,
    },
  });
  if (enquiry.name !== input.name || enquiry.phone !== input.phone || enquiry.course !== input.course || (enquiry.message ?? "") !== (input.message ?? "")) {
    throw new EnquiryConflictError("This submission has changed. Please submit it again.");
  }
  return enquiry;
}
export class EnquiryConflictError extends Error {}
export const getEnquiries = () => prisma.enquiry.findMany({ include: { student: { select: { id: true, admissionNumber: true } } }, orderBy: { createdAt: "desc" } });
export const updateEnquiryStatus = (id: string, status: "NEW" | "CONTACTED" | "CLOSED") => prisma.enquiry.update({ where: { id }, data: { status }, include: { student: { select: { id: true, admissionNumber: true } } } });

export async function admitEnquiry(id: string, input: CreateStudentInput) {
  return prisma.$transaction(async tx => {
    // Lock this enquiry so concurrent clicks and retries create only one student.
    await tx.$queryRaw`SELECT id FROM enquiries WHERE id = ${id}::uuid FOR UPDATE`;
    const enquiry = await tx.enquiry.findUnique({ where: { id }, include: { student: true } });
    if (!enquiry) throw new EnquiryNotFoundError();
    if (enquiry.student) return { student: enquiry.student, enquiry };
    const student = await tx.student.create({ data: {
      firstName: input.firstName, phone: input.phone,
      lastName: input.lastName ?? null, gender: input.gender ?? null, address: input.address ?? null,
      email: input.email?.toLowerCase() ?? null,
      dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
    } });
    const updated = await tx.enquiry.update({ where: { id }, data: { studentId: student.id, status: "CLOSED" }, include: { student: { select: { id: true, admissionNumber: true } } } });
    return { student, enquiry: updated };
  });
}
export class EnquiryNotFoundError extends Error {}
