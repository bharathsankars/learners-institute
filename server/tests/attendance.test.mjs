import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";
import { attendanceSaveSchema } from "../dist/src/validators/attendance.validator.js";
import { getAttendanceSheetController, saveAttendanceController, getAttendanceMonthController } from "../dist/src/controllers/attendance.controller.js";
import { getBatchStudentsController } from "../dist/src/controllers/batch.controller.js";
import { instituteToday } from "../dist/src/services/attendance.service.js";

const batchId = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
const a = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const b = "7a8b9c0d-1e2f-4a3b-9c4d-5e6f7a8b9c0d";
const lecturer = "11111111-1111-4111-8111-111111111111";
const batch = { id: batchId, name: "Morning A", days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"], startMinutes: 420, endMinutes: 480, isActive: true, instructorId: lecturer };
const today = instituteToday();
const daysAgo = (n) => instituteToday(new Date(Date.now() - n * 86_400_000));

function response(role = "ADMIN", userId = "admin") { return { locals: { userId, userRole: role }, statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }

async function withStubs(stubs, run) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]]);
  try { for (const [target, key, value] of stubs) target[key] = value; await run(); }
  finally { for (const [target, key, value] of saved) target[key] = value; }
}

function db(upserts = []) {
  return [
    [prisma.batch, "findUnique", async () => batch],
    [prisma.student, "findMany", async ({ where }) => (where.id?.in ?? [a, b]).filter((id) => [a, b].includes(id)).map((id) => ({ id, admissionNumber: "LIT1", firstName: id === a ? "Anjali" : "Rahul", lastName: null }))],
    [prisma.attendance, "findMany", async () => []],
    [prisma.attendance, "upsert", (args) => { upserts.push(args); return args; }],
    [prisma, "$transaction", async (operations) => operations],
  ];
}

test("a register needs at least one student and each student once", () => {
  assert.equal(attendanceSaveSchema.safeParse({ batchId, date: today, records: [] }).success, false);
  assert.equal(attendanceSaveSchema.safeParse({ batchId, date: today, records: [{ studentId: a, status: "PRESENT" }, { studentId: a, status: "ABSENT" }] }).success, false);
  assert.equal(attendanceSaveSchema.safeParse({ batchId, date: "2-11-2026", records: [{ studentId: a, status: "PRESENT" }] }).success, false);
});

test("saving upserts one mark per student and reports the totals", async () => {
  const upserts = [];
  await withStubs(db(upserts), async () => {
    const res = response();
    await saveAttendanceController({ body: { batchId, date: today, records: [{ studentId: a, status: "PRESENT" }, { studentId: b, status: "ABSENT" }] } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.body.message, /1 present, 1 absent/);
    assert.equal(upserts.length, 2);
    assert.deepEqual(upserts[0].where.batchId_studentId_date.date, new Date(`${today}T00:00:00.000Z`));
    assert.equal(upserts[1].update.status, "ABSENT");
    assert.equal(upserts[0].create.markedById, "admin");
  });
});

test("future dates and students outside the batch are refused", async () => {
  const tomorrow = instituteToday(new Date(Date.now() + 86_400_000));
  await withStubs(db(), async () => {
    const future = response();
    await saveAttendanceController({ body: { batchId, date: tomorrow, records: [{ studentId: a, status: "PRESENT" }] } }, future);
    assert.equal(future.statusCode, 409);
    const outsider = response();
    await saveAttendanceController({ body: { batchId, date: today, records: [{ studentId: "22222222-2222-4222-8222-222222222222", status: "PRESENT" }] } }, outsider);
    assert.equal(outsider.statusCode, 409);
    assert.match(outsider.body.message, /no longer in this batch/);
  });
});

test("lecturers use only their own batches and only the last 7 days", async () => {
  await withStubs(db(), async () => {
    const other = response("STAFF", "someone-else");
    await getAttendanceSheetController({ query: { batchId, date: today } }, other);
    assert.equal(other.statusCode, 403);

    const own = response("STAFF", lecturer);
    await saveAttendanceController({ body: { batchId, date: daysAgo(3), records: [{ studentId: a, status: "PRESENT" }] } }, own);
    assert.equal(own.statusCode, 200);

    const old = response("STAFF", lecturer);
    await saveAttendanceController({ body: { batchId, date: daysAgo(10), records: [{ studentId: a, status: "PRESENT" }] } }, old);
    assert.equal(old.statusCode, 403);
    assert.match(old.body.message, /last 7 days/);

    const admin = response("ADMIN");
    await saveAttendanceController({ body: { batchId, date: daysAgo(40), records: [{ studentId: a, status: "PRESENT" }] } }, admin);
    assert.equal(admin.statusCode, 200);
  });
});

test("the sheet shows saved marks and whether the batch meets that day", async () => {
  await withStubs([...db(), [prisma.attendance, "findMany", async () => [{ studentId: b, status: "ABSENT", updatedAt: new Date(), markedBy: { firstName: "Lakshmi", lastName: "Pillai" } }]]], async () => {
    const res = response();
    await getAttendanceSheetController({ query: { batchId, date: "2026-11-01" } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.scheduled, false, "1 Nov 2026 is a Sunday");
    assert.equal(res.body.data.marked, true);
    assert.deepEqual(res.body.data.students.map((student) => student.status), [null, "ABSENT"]);
  });
});

test("the monthly register totals each student's marks", async () => {
  await withStubs([
    [prisma.batch, "findUnique", async () => batch],
    [prisma.attendance, "findMany", async () => [
      { studentId: a, date: new Date("2026-11-02T00:00:00Z"), status: "PRESENT" },
      { studentId: a, date: new Date("2026-11-03T00:00:00Z"), status: "ABSENT" },
      { studentId: a, date: new Date("2026-11-04T00:00:00Z"), status: "PRESENT" },
    ]],
    [prisma.student, "findMany", async () => [{ id: a, admissionNumber: "LIT1", firstName: "Anjali", lastName: null, batchId }, { id: b, admissionNumber: "LIT2", firstName: "Rahul", lastName: null, batchId }]],
  ], async () => {
    const res = response();
    await getAttendanceMonthController({ query: { batchId, month: "2026-11" } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body.data.days, ["2026-11-02", "2026-11-03", "2026-11-04"]);
    const [anjali, rahul] = res.body.data.students;
    assert.deepEqual([anjali.present, anjali.absent, anjali.percent], [2, 1, 67]);
    assert.equal(rahul.percent, null);
  });
});

test("a lecturer cannot open another lecturer's batch students", async () => {
  await withStubs([[prisma.batch, "findUnique", async () => ({ id: batchId, instructorId: lecturer })]], async () => {
    const res = response("STAFF", "someone-else");
    await getBatchStudentsController({ params: { id: batchId } }, res);
    assert.equal(res.statusCode, 403);
  });
});
