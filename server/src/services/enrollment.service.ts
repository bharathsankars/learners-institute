import { prisma } from "../config/database.js";

export async function getStudentEnrollments(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });

  if (!student) {
    return null;
  }

  return prisma.enrollment.findMany({
    where: { studentId },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      enrolledAt: "desc",
    },
  });
}

export class EnrollmentNotFoundError extends Error {}
export class EnrollmentConflictError extends Error {}

export async function assignStudentCourse(
  studentId: string,
  courseId: string,
) {
  const [student, course] = await Promise.all([
    prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true },
    }),
    prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, isActive: true },
    }),
  ]);

  if (!student) {
    throw new EnrollmentNotFoundError("Student not found.");
  }

  if (!course) {
    throw new EnrollmentNotFoundError("Course not found.");
  }

  if (!course.isActive) {
    throw new EnrollmentConflictError(
      "Inactive courses cannot be assigned.",
    );
  }

  const existing = await prisma.enrollment.findFirst({
    where: {
      studentId,
      courseId,
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (existing) {
    throw new EnrollmentConflictError(
      "Student is already enrolled in this course.",
    );
  }

  return prisma.enrollment.create({
    data: {
      studentId,
      courseId,
    },
    select: {
      id: true,
      status: true,
      enrolledAt: true,
      completedAt: true,
      course: {
        select: {
          id: true,
          title: true,
          slug: true,
          isActive: true,
        },
      },
    },
  });
}
