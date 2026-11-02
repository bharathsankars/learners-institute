import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";
import { generateTemporaryPassword } from "../dist/src/services/admin-user.service.js";
import { resetAdminUserPasswordController, signOutAdminUserController } from "../dist/src/controllers/admin-user.controller.js";
import { logActivity } from "../dist/src/services/activity.service.js";
import { getExportController } from "../dist/src/controllers/tools.controller.js";

const userId = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
const me = "3f1b2c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
function response() { return { locals: { userId: me, userRole: "SUPER_ADMIN" }, headers: {}, statusCode: 200, setHeader(name, value) { this.headers[name] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; }, send(value) { this.sent = value; return this; } }; }

async function withStubs(stubs, run) {
  const saved = stubs.map(([target, key]) => [target, key, target[key]]);
  try { for (const [target, key, value] of stubs) target[key] = value; await run(); }
  finally { for (const [target, key, value] of saved) target[key] = value; }
}

test("temporary passwords are 12 readable characters without look-alikes", () => {
  const passwords = new Set(Array.from({ length: 50 }, () => generateTemporaryPassword()));
  assert.equal(passwords.size, 50);
  for (const password of passwords) {
    assert.equal(password.length, 12);
    assert.doesNotMatch(password, /[0O1lI]/);
  }
});

test("resetting a staff password signs them out; the Super Admin is protected", async () => {
  let sessionsCleared = false;
  let stored;
  await withStubs([
    [prisma.user, "findUnique", async () => ({ role: "STAFF" })],
    [prisma, "$transaction", async (fn) => fn({
      user: { update: async ({ data }) => { stored = data.password; return { id: userId, firstName: "Lakshmi", lastName: "Pillai" }; } },
      session: { deleteMany: async ({ where }) => { sessionsCleared = where.userId === userId; } },
    })],
  ], async () => {
    const res = response();
    await resetAdminUserPasswordController({ params: { id: userId } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.data.temporaryPassword.length, 12);
    assert.notEqual(stored, res.body.data.temporaryPassword, "only the hash is stored");
    assert.equal(sessionsCleared, true);
  });
  await withStubs([[prisma.user, "findUnique", async () => ({ role: "SUPER_ADMIN" })]], async () => {
    const res = response();
    await resetAdminUserPasswordController({ params: { id: userId } }, res);
    assert.equal(res.statusCode, 403);
  });
});

test("signing yourself out keeps the current session; others lose every session", async () => {
  const calls = [];
  await withStubs([
    [prisma.user, "findUnique", async () => ({ firstName: "Bharath", lastName: "Sankar", role: "SUPER_ADMIN" })],
    [prisma.session, "deleteMany", async ({ where }) => { calls.push(where); return { count: 2 }; }],
  ], async () => {
    await signOutAdminUserController({ params: { id: me }, cookies: { session: "current-token" } }, response());
    await signOutAdminUserController({ params: { id: userId }, cookies: { session: "current-token" } }, response());
  });
  assert.equal(calls[0].userId, me);
  assert.ok(calls[0].tokenHash?.not, "own sign-out keeps the current session");
  assert.deepEqual(calls[1], { userId });
});

test("a failing activity summary never throws", async () => {
  await logActivity(response(), () => { throw new Error("missing field"); });
});

test("exports reject unknown datasets and send an xlsx attachment", async () => {
  const unknown = response();
  await getExportController({ params: { dataset: "passwords" } }, unknown);
  assert.equal(unknown.statusCode, 404);

  await withStubs([[prisma.batch, "findMany", async () => [{ name: "Morning A", days: ["MON", "SAT"], startMinutes: 420, endMinutes: 480, capacity: 15, isActive: true, instructor: null, _count: { students: 3 } }]]], async () => {
    const res = response();
    await getExportController({ params: { dataset: "batches" } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers["Content-Disposition"], /learners-batches-\d{4}-\d{2}-\d{2}\.xlsx/);
    assert.equal(res.sent.subarray(0, 2).toString(), "PK", "xlsx is a zip file");
  });
});
