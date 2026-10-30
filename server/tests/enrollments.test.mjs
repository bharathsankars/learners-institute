import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../dist/src/config/database.js";
import {
  assignStudentCourse,
  getStudentEnrollments,
} from "../dist/src/services/enrollment.service.js";
import {
  assignStudentCourseController,
  getStudentEnrollmentsController,
} from "../dist/src/controllers/enrollment.controller.js";

const studentId = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
const courseId = "be58c3eb-8056-4ec9-8d02-d9befc762939";

function response() {
  return {
    statusCode: 200,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

async function withMockedPrisma(callback) {
  const originals = {
    student: prisma.student.findUnique,
    course: prisma.course.findUnique,
    enrollmentFindFirst: prisma.enrollment.findFirst,
    enrollmentFindMany: prisma.enrollment.findMany,
    enrollmentCreate: prisma.enrollment.create,
  };

  try {
    prisma.student.findUnique = async () => ({ id: studentId });
    prisma.course.findUnique = async () => ({
      id: courseId,
      isActive: true,
    });
    prisma.enrollment.findFirst = async () => null;
    prisma.enrollment.findMany = async () => [];
    prisma.enrollment.create = async () => ({
      id: "new-enrollment",
      status: "ACTIVE",
      course: { id: courseId, title: "Test course" },
    });

    await callback();
  } finally {
    prisma.student.findUnique = originals.student;
    prisma.course.findUnique = originals.course;
    prisma.enrollment.findFirst = originals.enrollmentFindFirst;
    prisma.enrollment.findMany = originals.enrollmentFindMany;
    prisma.enrollment.create = originals.enrollmentCreate;
  }
}

test("lists enrollments for an existing student", async () => {
  await withMockedPrisma(async () => {
    prisma.enrollment.findMany = async options => {
      assert.equal(options.where.studentId, studentId);
      return [{ id: "existing-enrollment" }];
    };

    const result = await getStudentEnrollments(studentId);
    assert.equal(result.length, 1);
  });
});

test("returns 404 when listing enrollments for an unknown student", async () => {
  await withMockedPrisma(async () => {
    prisma.student.findUnique = async () => null;

    const res = response();
    await getStudentEnrollmentsController(
      { params: { id: studentId } },
      res,
    );

    assert.equal(res.statusCode, 404);
    assert.equal(res.body.success, false);
  });
});

test("assigns an active course to an existing student", async () => {
  await withMockedPrisma(async () => {
    const enrollment = await assignStudentCourse(studentId, courseId);
    assert.equal(enrollment.status, "ACTIVE");
    assert.equal(enrollment.course.id, courseId);
  });
});

test("returns 201 for a successful assignment", async () => {
  await withMockedPrisma(async () => {
    const res = response();

    await assignStudentCourseController(
      { params: { id: studentId }, body: { courseId } },
      res,
    );

    assert.equal(res.statusCode, 201);
    assert.equal(res.body.success, true);
  });
});

test("rejects a duplicate active enrollment with 409", async () => {
  await withMockedPrisma(async () => {
    prisma.enrollment.findFirst = async () => ({
      id: "existing-enrollment",
    });
    prisma.enrollment.create = async () => {
      throw new Error("Duplicate should not be created");
    };

    const res = response();
    await assignStudentCourseController(
      { params: { id: studentId }, body: { courseId } },
      res,
    );

    assert.equal(res.statusCode, 409);
  });
});

test("rejects inactive courses with 409", async () => {
  await withMockedPrisma(async () => {
    prisma.course.findUnique = async () => ({
      id: courseId,
      isActive: false,
    });

    const res = response();
    await assignStudentCourseController(
      { params: { id: studentId }, body: { courseId } },
      res,
    );

    assert.equal(res.statusCode, 409);
  });
});

test("rejects unknown students and courses with 404", async () => {
  await withMockedPrisma(async () => {
    prisma.student.findUnique = async () => null;

    let res = response();
    await assignStudentCourseController(
      { params: { id: studentId }, body: { courseId } },
      res,
    );
    assert.equal(res.statusCode, 404);

    prisma.student.findUnique = async () => ({ id: studentId });
    prisma.course.findUnique = async () => null;

    res = response();
    await assignStudentCourseController(
      { params: { id: studentId }, body: { courseId } },
      res,
    );
    assert.equal(res.statusCode, 404);
  });
});

test("rejects invalid IDs and unexpected request fields with 400", async () => {
  await withMockedPrisma(async () => {
    for (const request of [
      { params: { id: "invalid" }, body: { courseId } },
      { params: { id: studentId }, body: { courseId: "invalid" } },
      { params: { id: studentId }, body: { courseId, status: "ACTIVE" } },
    ]) {
      const res = response();
      await assignStudentCourseController(request, res);
      assert.equal(res.statusCode, 400);
    }
  });
});

test("converts a database uniqueness violation into 409", async () => {
  await withMockedPrisma(async () => {
    prisma.enrollment.create = async () => {
      throw { code: "P2002" };
    };

    const res = response();
    await assignStudentCourseController(
      { params: { id: studentId }, body: { courseId } },
      res,
    );

    assert.equal(res.statusCode, 409);
  });
});
