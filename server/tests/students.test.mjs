import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../dist/src/app.js";
import { prisma } from "../dist/src/config/database.js";
import * as studentService from "../dist/src/services/student.service.js";

// Exercise the actual Express routing without a network listener or database writes.
function request(method, path, body = {}) {
  return new Promise((resolve, reject) => {
    const req = { method, url: path, originalUrl: path, headers: { cookie: "session=test-session" }, body, socket: {}, on() {}, unpipe() {} };
    const res = { headers: {}, statusCode: 200, setHeader(name, value) { this.headers[name] = value; }, getHeader(name) { return this.headers[name]; }, removeHeader(name) { delete this.headers[name]; }, end(text) { resolve({ status: this.statusCode, body: text ? JSON.parse(text) : null }); } };
    app.handle(req, res, reject);
  });
}
const id = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
const courseId = "be58c3eb-8056-4ec9-8d02-d9befc762939";
const student = { firstName: "Alice", phone: "+91 94461 25964" };
const destructive = [
  [prisma.student, "delete"], [prisma.student, "deleteMany"],
  [prisma.enrollment, "delete"], [prisma.enrollment, "deleteMany"],
  [prisma.feePlan, "delete"], [prisma.feePlan, "deleteMany"],
  [prisma.payment, "delete"], [prisma.payment, "deleteMany"],
];

// Runs as a signed-in user with the given Prisma stubs; any delete call fails the test.
async function asRole(role, run, stubs = []) {
  const replaced = [[prisma.session, "findUnique"], ...destructive, ...stubs.map(([model, method]) => [model, method])];
  const originals = replaced.map(([model, method]) => model[method]);
  const calls = [];
  try {
    prisma.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 60000), user: { isActive: true, role } });
    for (const [model, method] of destructive) model[method] = async () => { calls.push(method); throw new Error("Student records must never be deleted."); };
    for (const [model, method, stub] of stubs) model[method] = stub;
    await run();
  } finally {
    replaced.forEach(([model, method], index) => { model[method] = originals[index]; });
  }
  assert.deepEqual(calls, [], `${role} triggered a delete`);
}

test("no role can permanently delete a student, enrolment or fee plan", async () => {
  for (const role of ["STAFF", "ADMIN", "SUPER_ADMIN"]) {
    await asRole(role, async () => {
      for (const target of [id, "not-a-uuid"]) {
        const response = await request("DELETE", `/api/students/${target}`);
        assert.equal(response.status, 405, `${role} DELETE ${target}`);
        assert.equal(response.body.success, false);
        assert.match(response.body.message, /cannot be deleted/);
      }
    });
  }
});

test("the student service no longer exposes a delete operation", () => {
  assert.equal("deleteStudent" in studentService, false);
});

test("the student register lists every status, newest first", async () => {
  const records = ["ACTIVE", "INACTIVE", "COMPLETED"].map((status, index) => ({ id: String(index), ...student, status }));
  await asRole("STAFF", async () => {
    const response = await request("GET", "/api/students");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.students.map(record => record.status), ["ACTIVE", "INACTIVE", "COMPLETED"]);
  }, [[prisma.student, "findMany", async options => { assert.deepEqual(options, { include: { admittedBy: { select: { id: true, firstName: true, lastName: true } } }, orderBy: { createdAt: "desc" } }); return records; }]]);
});

// Interactive-transaction stand-in: records the registration lock and returns
// the given rows from the duplicate lookup.
function fakeRegistrationTx(candidates, calls = []) {
  return {
    $executeRaw: async (strings) => { calls.push(strings.join("?")); return 0; },
    $queryRaw: async (strings) => {
      const sql = strings.join("?");
      calls.push(sql);
      return sql.includes("student_admission_counter") ? [{ lastNumber: 1 }] : candidates;
    },
    student: { create: async ({ data }) => { calls.push("create"); return { id, status: "ACTIVE", ...data }; } },
  };
}

test("students can still be created and have their details updated", async () => {
  await asRole("ADMIN", async () => {
    const created = await request("POST", "/api/students", { ...student, email: "Alice@Example.invalid" });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.student.email, "alice@example.invalid");

    const updated = await request("PATCH", `/api/students/${id}`, { ...student, firstName: "Alicia", lastName: "", address: "Kochi", status: "ACTIVE" });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.student.firstName, "Alicia");
    assert.equal(updated.body.data.student.lastName, null);
    assert.equal(updated.body.data.student.address, "Kochi");

    assert.equal((await request("PATCH", `/api/students/${courseId}`, { ...student, status: "ACTIVE" })).status, 404);
  }, [
    [prisma, "$transaction", async (run) => run(fakeRegistrationTx([]))],
    [prisma.student, "update", async ({ where, data }) => {
      if (where.id === courseId) throw Object.assign(new Error("Not found"), { code: "P2025" });
      return { id: where.id, ...data };
    }],
  ]);
});

test("students keep ACTIVE, INACTIVE and COMPLETED as their only statuses", async () => {
  await asRole("ADMIN", async () => {
    for (const status of ["ACTIVE", "INACTIVE", "COMPLETED"]) {
      const response = await request("PATCH", `/api/students/${id}`, { ...student, status });
      assert.equal(response.status, 200, status);
      assert.equal(response.body.data.student.status, status);
    }
    for (const status of ["DELETED", "ARCHIVED", undefined]) {
      assert.equal((await request("PATCH", `/api/students/${id}`, { ...student, status })).status, 400, String(status));
    }
  }, [[prisma.student, "update", async ({ where, data }) => ({ id: where.id, ...data })]]);
});

test("enrolment APIs keep working for students in the permanent register", async () => {
  const course = { id: courseId, title: "Tally Prime", slug: "tally-prime", isActive: true };
  const enrollment = { id: "enrollment-1", status: "ACTIVE", enrolledAt: "2026-10-30T00:00:00.000Z", completedAt: null, course };
  await asRole("STAFF", async () => {
    const listed = await request("GET", `/api/students/${id}/enrollments`);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data.enrollments[0].course.title, "Tally Prime");
    // Lecturers can see enrolments but not assign courses.
    assert.equal((await request("POST", `/api/students/${id}/enrollments`, { courseId })).status, 403);
  }, [
    [prisma.student, "findUnique", async () => ({ id })],
    [prisma.enrollment, "findMany", async () => [enrollment]],
  ]);
  await asRole("ADMIN", async () => {

    const assigned = await request("POST", `/api/students/${id}/enrollments`, { courseId });
    assert.equal(assigned.status, 201);
    assert.equal(assigned.body.data.enrollment.id, "enrollment-1");
  }, [
    [prisma.student, "findUnique", async () => ({ id })],
    [prisma.course, "findUnique", async () => course],
    [prisma.enrollment, "findMany", async () => [enrollment]],
    [prisma.enrollment, "findFirst", async () => null],
    [prisma.enrollment, "create", async () => enrollment],
  ]);
});

test("manual registration rejects a duplicate under the registration lock but accepts siblings", async () => {
  const existing = { admissionNumber: "LIT007", firstName: "Alice", lastName: null, phone: "9446125964", email: "family@example.invalid" };
  await asRole("ADMIN", async () => {
    const calls = [];
    prisma.$transaction = async (run) => run(fakeRegistrationTx([existing], calls));
    const duplicate = await request("POST", "/api/students", { firstName: " alice ", phone: "+91 94461 25964" });
    assert.equal(duplicate.status, 409);
    assert.match(duplicate.body.message, /already registered as LIT007/);
    assert.equal(duplicate.body.data.admissionNumber, "LIT007");
    assert.ok(calls.findIndex((sql) => sql.includes("FOR UPDATE")) < calls.findIndex((sql) => sql.includes("FROM students")), "lock before lookup");
    assert.equal(calls.includes("create"), false);

    const sameEmail = await request("POST", "/api/students", { firstName: "Alice", phone: "9000000000", email: "FAMILY@example.invalid" });
    assert.equal(sameEmail.status, 409);

    // A sibling sharing the family phone and email is a different student.
    const sibling = await request("POST", "/api/students", { firstName: "Bob", phone: "9446125964", email: "family@example.invalid" });
    assert.equal(sibling.status, 201);
  }, [[prisma, "$transaction", async () => { throw new Error("replaced in test"); }]]);
});
