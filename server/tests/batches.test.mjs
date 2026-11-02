import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";
import { batchInputSchema } from "../dist/src/validators/batch.validator.js";
import {
  assignBatchStudentController,
  createBatchController,
  deleteBatchController,
  removeBatchStudentController,
  updateBatchController,
} from "../dist/src/controllers/batch.controller.js";

const batchId = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
const studentId = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
const instructorId = "7a8b9c0d-1e2f-4a3b-9c4d-5e6f7a8b9c0d";
const valid = { name: "Morning A", days: ["SAT", "MON", "MON"], startTime: "07:00", endTime: "08:30", capacity: 15 };

function response() { return { statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }

// Temporarily replace prisma delegate methods; always restored.
async function withStubs(stubs, run) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]]);
  try {
    for (const [target, key, value] of stubs) target[key] = value;
    await run();
  } finally {
    for (const [target, key, value] of saved) target[key] = value;
  }
}

test("batch input converts times to minutes and orders and de-duplicates days", () => {
  const input = batchInputSchema.parse(valid);
  assert.equal(input.startTime, 420);
  assert.equal(input.endTime, 510);
  assert.deepEqual(input.days, ["MON", "SAT"]);
  assert.equal(input.instructorId, null);
  assert.equal(input.isActive, true);
});

test("batch input rejects reversed times, no days, bad times and out-of-range capacity", () => {
  for (const changes of [
    { startTime: "09:00", endTime: "08:00" },
    { startTime: "08:00", endTime: "08:00" },
    { days: [] },
    { startTime: "7:00" },
    { endTime: "24:00" },
    { capacity: 0 },
    { capacity: 501 },
    { capacity: 2.5 },
    { name: " " },
  ]) {
    assert.equal(batchInputSchema.safeParse({ ...valid, ...changes }).success, false, JSON.stringify(changes));
  }
});

test("creating a batch with an inactive or recovery instructor is refused", async () => {
  for (const user of [null, { isActive: false, role: "STAFF" }, { isActive: true, role: "RECOVERY_ADMIN" }]) {
    let created = false;
    await withStubs([[prisma.user, "findUnique", async () => user], [prisma.batch, "create", async () => { created = true; }]], async () => {
      const res = response();
      await createBatchController({ body: { ...valid, instructorId } }, res);
      assert.equal(res.statusCode, 409);
      assert.equal(created, false);
    });
  }
});

test("creating a batch returns the student count and maps duplicate names to 409", async () => {
  await withStubs([[prisma.batch, "create", async ({ data }) => ({ id: batchId, ...data, instructor: null, _count: { students: 0 } })]], async () => {
    const res = response();
    await createBatchController({ body: valid }, res);
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.data.batch.studentCount, 0);
    assert.equal(res.body.data.batch._count, undefined);
    assert.equal(res.body.data.batch.startMinutes, 420);
  });
  await withStubs([[prisma.batch, "create", async () => { throw { code: "P2002" }; }]], async () => {
    const res = response();
    await createBatchController({ body: valid }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /already exists/);
  });
});

test("capacity cannot be lowered below the students already in the batch", async () => {
  let updated = false;
  await withStubs([[prisma.batch, "findUnique", async () => ({ _count: { students: 12 } })], [prisma.batch, "update", async () => { updated = true; }]], async () => {
    const res = response();
    await updateBatchController({ params: { id: batchId }, body: { ...valid, capacity: 10 } }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /12 students/);
    assert.equal(updated, false);
  });
});

test("a batch with students cannot be deleted; an empty one can", async () => {
  let deleted = false;
  await withStubs([[prisma.student, "count", async () => 3], [prisma.attendance, "count", async () => 0], [prisma.batch, "delete", async () => { deleted = true; }]], async () => {
    const res = response();
    await deleteBatchController({ params: { id: batchId } }, res);
    assert.equal(res.statusCode, 409);
    assert.equal(deleted, false);
  });
  await withStubs([[prisma.student, "count", async () => 0], [prisma.attendance, "count", async () => 4]], async () => {
    const res = response();
    await deleteBatchController({ params: { id: batchId } }, res);
    assert.equal(res.statusCode, 409);
    assert.match(res.body.message, /attendance history/);
  });
  await withStubs([[prisma.student, "count", async () => 0], [prisma.attendance, "count", async () => 0], [prisma.batch, "delete", async ({ where }) => { deleted = where.id === batchId; return { name: "Morning A" }; }]], async () => {
    const res = response();
    await deleteBatchController({ params: { id: batchId } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(deleted, true);
  });
});

// A fake transaction client recording the row lock and the final update.
function fakeTransaction(batch, student, log) {
  const tx = {
    $queryRaw: async (strings) => { log.push(strings.join("?")); },
    batch: { findUnique: async () => batch },
    student: { findUnique: async () => student, update: async ({ where, data }) => { log.push(`update ${where.id} -> ${data.batchId}`); return { id: where.id }; } },
  };
  return async (fn) => fn(tx);
}

test("assigning locks the batch row, then moves the student in", async () => {
  const log = [];
  const batch = { name: "Morning A", capacity: 15, isActive: true, _count: { students: 14 } };
  await withStubs([[prisma, "$transaction", fakeTransaction(batch, { status: "ACTIVE", batchId: "other" }, log)]], async () => {
    const res = response();
    await assignBatchStudentController({ params: { id: batchId }, body: { studentId } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(log[0], /FOR UPDATE/);
    assert.equal(log[1], `update ${studentId} -> ${batchId}`);
  });
});

test("assigning is refused for a full or archived batch, an inactive student, or a repeat", async () => {
  const open = { name: "Morning A", capacity: 15, isActive: true, _count: { students: 3 } };
  const cases = [
    [{ ...open, _count: { students: 15 } }, { status: "ACTIVE", batchId: null }, /full/],
    [{ ...open, isActive: false }, { status: "ACTIVE", batchId: null }, /Archived/],
    [open, { status: "COMPLETED", batchId: null }, /active students/],
    [open, { status: "ACTIVE", batchId }, /already in this batch/],
  ];
  for (const [batch, student, message] of cases) {
    const log = [];
    await withStubs([[prisma, "$transaction", fakeTransaction(batch, student, log)]], async () => {
      const res = response();
      await assignBatchStudentController({ params: { id: batchId }, body: { studentId } }, res);
      assert.equal(res.statusCode, 409);
      assert.match(res.body.message, message);
      assert.equal(log.some((entry) => entry.startsWith("update")), false);
    });
  }
});

test("removing only clears the student from that batch", async () => {
  let cleared = false;
  await withStubs([[prisma.student, "findFirst", async () => null], [prisma.student, "updateMany", async () => { cleared = true; return { count: 0 }; }]], async () => {
    const res = response();
    await removeBatchStudentController({ params: { id: batchId, studentId } }, res);
    assert.equal(res.statusCode, 404);
    assert.equal(cleared, false);
  });
  await withStubs([
    [prisma.student, "findFirst", async ({ where }) => { assert.deepEqual(where, { id: studentId, batchId }); return { firstName: "Anjali", lastName: null, batch: { name: "Morning A" } }; }],
    [prisma.student, "updateMany", async ({ where, data }) => { assert.deepEqual(where, { id: studentId, batchId }); assert.equal(data.batchId, null); return { count: 1 }; }],
  ], async () => {
    const res = response();
    await removeBatchStudentController({ params: { id: batchId, studentId } }, res);
    assert.equal(res.statusCode, 200);
  });
});
