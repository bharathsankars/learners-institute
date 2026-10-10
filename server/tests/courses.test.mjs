import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";
import { deleteCourseController } from "../dist/src/controllers/course.controller.js";
const id = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
function response() { return { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }

test("course deletion explains enrollment conflicts without modifying related records", async () => {
  const original = prisma.course.delete;
  try {
    prisma.course.delete = async () => { throw { code: "P2003" }; };
    const res = response();
    await deleteCourseController({ params: { id } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /student enrollments/);
    assert.match(res.body.message, /uncheck Active course/);
  } finally { prisma.course.delete = original; }
});

test("course deletion succeeds for an unlinked record and reports a missing record", async () => {
  const original = prisma.course.delete;
  try {
    prisma.course.delete = async ({ where }) => { assert.equal(where.id, id); return { id }; };
    const success = response();
    await deleteCourseController({ params: { id } }, success);
    assert.equal(success.statusCode, 200);
    assert.equal(success.body.success, true);
    prisma.course.delete = async () => { throw { code: "P2025" }; };
    const missing = response();
    await deleteCourseController({ params: { id } }, missing);
    assert.equal(missing.statusCode, 404);
  } finally { prisma.course.delete = original; }
});
