// Run explicitly against the configured local database. All fixtures are rolled back.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { app } from "../dist/src/app.js";
import { prisma } from "../dist/src/config/database.js";
import { startSession } from "../dist/src/middleware/session.js";
const server = app.listen(0, "127.0.0.1");
await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
const origin = `http://127.0.0.1:${server.address().port}`;
const originalEnquiry = prisma.enquiry;
const originalSession = prisma.session;
const originalStudent = prisma.student;
const originalTransaction = prisma.$transaction;
const rollback = new Error("ROLLBACK_TEST_FIXTURES");
let verified = false;
try {
  await prisma.$transaction(async tx => {
    prisma.enquiry = tx.enquiry;
    prisma.session = tx.session;
    prisma.student = tx.student;
    // Admission joins this rollback-only transaction for the integration test.
    prisma.$transaction = async callback => callback(tx);
    const fixtureId = randomUUID();
    const user = await tx.user.create({ data: { firstName: "Enquiry", lastName: "Test", username: `enquiry-test-${fixtureId}`, email: `${fixtureId}@example.invalid`, password: randomUUID(), role: "ADMIN" } });
    let token;
    await startSession(user.id, { cookie(_name, value) { token = value; } });
    const headers = { "Content-Type": "application/json" };
    const input = { requestId: randomUUID(), name: "Temporary Enquiry Test", phone: "1234567890", course: "English Typewriting", message: "Temporary integration test; rolled back." };
    const submitted = await fetch(`${origin}/api/enquiries`, { method: "POST", headers, body: JSON.stringify(input) });
    assert.equal(submitted.status, 201);
    const id = (await submitted.json()).data.id;
    assert.equal((await tx.enquiry.findUnique({ where: { id } })).name, input.name);
    const anonymous = await fetch(`${origin}/api/enquiries`);
    assert.equal(anonymous.status, 401);
    const adminHeaders = { ...headers, Cookie: `session=${token}` };
    const listed = await fetch(`${origin}/api/enquiries`, { headers: adminHeaders });
    assert.equal(listed.status, 200);
    assert.ok((await listed.json()).data.enquiries.some(enquiry => enquiry.id === id));
    const updated = await fetch(`${origin}/api/enquiries/${id}`, { method: "PATCH", headers: adminHeaders, body: JSON.stringify({ status: "CONTACTED" }) });
    assert.equal(updated.status, 200);
    assert.equal((await tx.enquiry.findUnique({ where: { id } })).status, "CONTACTED");
    const retry = await fetch(`${origin}/api/enquiries`, { method: "POST", headers, body: JSON.stringify(input) });
    assert.equal(retry.status, 201);
    assert.equal((await retry.json()).data.id, id);
    assert.equal(await tx.enquiry.count({ where: { requestId: input.requestId } }), 1);
    const admissionInput = { firstName: "Temporary", lastName: "Enquiry Student", phone: input.phone, email: `${fixtureId}@example.invalid` };
    const anonymousAdmission = await fetch(`${origin}/api/enquiries/${id}/admit`, { method: "POST", headers, body: JSON.stringify(admissionInput) });
    assert.equal(anonymousAdmission.status, 401);
    const invalidAdmission = await fetch(`${origin}/api/enquiries/${id}/admit`, { method: "POST", headers: adminHeaders, body: JSON.stringify({ firstName: "" }) });
    assert.equal(invalidAdmission.status, 400);
    const admission = await fetch(`${origin}/api/enquiries/${id}/admit`, { method: "POST", headers: adminHeaders, body: JSON.stringify(admissionInput) });
    assert.equal(admission.status, 200);
    const admitted = (await admission.json()).data;
    assert.ok(admitted.student.admissionNumber);
    assert.equal(admitted.enquiry.studentId, admitted.student.id);
    assert.equal(admitted.enquiry.status, "CLOSED");
    const retryAdmission = await fetch(`${origin}/api/enquiries/${id}/admit`, { method: "POST", headers: adminHeaders, body: JSON.stringify(admissionInput) });
    assert.equal(retryAdmission.status, 200);
    assert.equal((await retryAdmission.json()).data.student.id, admitted.student.id);
    assert.equal(await tx.student.count({ where: { email: admissionInput.email } }), 1);
    const admissionList = await fetch(`${origin}/api/enquiries`, { headers: adminHeaders });
    assert.equal((await admissionList.json()).data.enquiries.find(record => record.id === id).student.admissionNumber, admitted.student.admissionNumber);
    verified = true;
    throw rollback;
  }, { timeout: 20000 });
} catch (error) {
  if (error !== rollback) throw error;
} finally {
  prisma.enquiry = originalEnquiry;
  prisma.session = originalSession;
  prisma.student = originalStudent;
  prisma.$transaction = originalTransaction;
  await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
assert.ok(verified);
console.log("PASS: real HTTP submission, PostgreSQL persistence, anonymous access rejection, admin visibility, status persistence, admission creation, student linking and duplicate retries. Test fixtures rolled back.");
