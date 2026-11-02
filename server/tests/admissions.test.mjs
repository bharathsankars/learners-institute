import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";
import { admissionSchema } from "../dist/src/validators/admission.validator.js";
import { createAdmissionController } from "../dist/src/controllers/admission.controller.js";
import { createStudentController } from "../dist/src/controllers/student.controller.js";

const courseA = "11111111-1111-4111-8111-111111111111";
const courseB = "22222222-2222-4222-8222-222222222222";
const batchId = "33333333-3333-4333-8333-333333333333";
const enquiryId = "44444444-4444-4444-8444-444444444444";
const userId = "55555555-5555-4555-8555-555555555555";
const student = { firstName: "Anjali", lastName: "Menon", phone: "+91 94461 22345" };

function response(locals = { userId, userRole: "SUPER_ADMIN" }) {
  return { locals, statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
}

// A fake transaction client that records each step in order.
function fakeDb(overrides = {}) {
  const log = [];
  const state = {
    duplicates: [],
    enquiry: { studentId: null },
    courses: [{ id: courseA, title: "English Higher", isActive: true }, { id: courseB, title: "Shorthand", isActive: true }],
    batch: { name: "Morning A", capacity: 15, isActive: true, _count: { students: 3 } },
    ...overrides,
  };
  const tx = {
    $executeRaw: async () => 0,
    $queryRaw: async (strings) => {
      const sql = strings.join("?");
      if (sql.includes("FROM students")) return state.duplicates;
      log.push(sql.includes("enquiries") ? "lock enquiry" : sql.includes("batches") ? "lock batch" : "lock registration");
      return [];
    },
    enquiry: {
      findUnique: async () => state.enquiry,
      update: async ({ data }) => { log.push(`enquiry ${data.status} -> ${data.studentId}`); },
    },
    course: { findMany: async ({ where }) => state.courses.filter((course) => where.id.in.includes(course.id)) },
    batch: { findUnique: async () => state.batch },
    student: {
      create: async ({ data }) => { log.push({ student: data }); return { id: "new-student" }; },
      findUniqueOrThrow: async () => ({ id: "new-student", firstName: "Anjali", admissionNumber: "LIT1045" }),
    },
    enrollment: {
      createManyAndReturn: async ({ data }) => { log.push(`enrol ${data.map((row) => row.courseId).join(",")}`); return data.map((row, index) => ({ id: `enrolment-${index}`, courseId: row.courseId })); },
    },
    feePlan: { create: async ({ data }) => { log.push(`fee ${data.enrollmentId} ${data.totalFeePaise}`); } },
  };
  return { log, transaction: async (fn) => fn(tx) };
}

async function admit(body, db, locals) {
  const original = prisma.$transaction;
  try {
    prisma.$transaction = db.transaction;
    const res = response(locals);
    await createAdmissionController({ body }, res);
    return res;
  } finally { prisma.$transaction = original; }
}

test("admission input needs a course, unique courses and fees that match them", () => {
  const base = { student, courseIds: [courseA] };
  assert.equal(admissionSchema.safeParse(base).success, true);
  assert.equal(admissionSchema.safeParse({ ...base, courseIds: [] }).success, false);
  assert.equal(admissionSchema.safeParse({ ...base, courseIds: [courseA, courseA] }).success, false);
  assert.equal(admissionSchema.safeParse({ ...base, fees: [{ courseId: courseB, totalFeePaise: 100 }] }).success, false);
  assert.equal(admissionSchema.safeParse({ ...base, fees: [{ courseId: courseA, totalFeePaise: 100, discountPaise: 200 }] }).success, false);
  assert.equal(admissionSchema.safeParse({ ...base, student: { ...student, firstName: "A" } }).success, false);
});

test("an enquiry admission locks, creates student, enrolments, batch place and fees, then closes the enquiry", async () => {
  const db = fakeDb();
  const res = await admit({ student, enquiryId, courseIds: [courseA, courseB], batchId, fees: [{ courseId: courseB, totalFeePaise: 450000 }] }, db);
  assert.equal(res.statusCode, 201);
  const steps = db.log.map((entry) => (typeof entry === "string" ? entry : "create student"));
  assert.deepEqual(steps, ["lock enquiry", "lock registration", "lock batch", "create student", `enrol ${courseA},${courseB}`, "fee enrolment-1 450000", "enquiry CLOSED -> new-student"]);
  const created = db.log.find((entry) => typeof entry === "object").student;
  assert.equal(created.batchId, batchId);
  assert.equal(created.admissionSource, "ENQUIRY");
  assert.equal(created.admittedById, userId);
});

test("a walk-in admission without a batch records the source and the admitting user", async () => {
  const db = fakeDb();
  const res = await admit({ student, courseIds: [courseA] }, db);
  assert.equal(res.statusCode, 201);
  const created = db.log.find((entry) => typeof entry === "object").student;
  assert.equal(created.admissionSource, "WALK_IN");
  assert.equal(created.batchId, null);
  assert.equal(db.log.includes("lock batch"), false);
});

test("only a Super Admin can set fees during admission", async () => {
  const db = fakeDb();
  const res = await admit({ student, courseIds: [courseA], fees: [{ courseId: courseA, totalFeePaise: 100 }] }, db, { userId, userRole: "STAFF" });
  assert.equal(res.statusCode, 403);
  assert.equal(db.log.length, 0);
});

test("nothing is created for a full batch, inactive course, duplicate or already-admitted enquiry", async () => {
  const cases = [
    [{ batch: { name: "Morning A", capacity: 15, isActive: true, _count: { students: 15 } } }, { batchId }, 409, /full/],
    [{ courses: [{ id: courseA, title: "English Higher", isActive: false }] }, {}, 409, /inactive/],
    [{ courses: [] }, {}, 404, /no longer exists/],
    [{ duplicates: [{ admissionNumber: "LIT1001", firstName: "Anjali", lastName: "Menon", phone: "+91 94461 22345", email: null }] }, {}, 409, /LIT1001/],
    [{ enquiry: { studentId: "someone" } }, { enquiryId }, 409, /already been admitted/],
  ];
  for (const [state, extra, status, message] of cases) {
    const db = fakeDb(state);
    const res = await admit({ student, courseIds: [courseA], ...extra }, db);
    assert.equal(res.statusCode, status, String(message));
    assert.match(JSON.stringify(res.body), message);
    assert.equal(db.log.some((entry) => typeof entry === "object"), false, `student created despite ${message}`);
  }
});

test("Add student records a walk-in admission by the signed-in user", async () => {
  const original = prisma.$transaction;
  let data;
  try {
    prisma.$transaction = async (fn) => fn({ $executeRaw: async () => 0, $queryRaw: async () => [], student: { create: async (args) => { data = args.data; return { id: "s" }; } } });
    const res = response({ userId, userRole: "STAFF" });
    await createStudentController({ body: student }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(data.admissionSource, "WALK_IN");
    assert.equal(data.admittedById, userId);
  } finally { prisma.$transaction = original; }
});
