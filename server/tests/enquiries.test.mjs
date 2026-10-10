import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";
import { createEnquirySchema } from "../dist/src/validators/enquiry.validator.js";
import { createEnquiry } from "../dist/src/services/enquiry.service.js";
import { createEnquiryController, getEnquiriesController, updateEnquiryController } from "../dist/src/controllers/enquiry.controller.js";
import { requireAuthenticated } from "../dist/src/middleware/session.js";
const input = { requestId: "e9a09b93-1bc2-4e99-9590-04aeb8e97981", name: "Test Visitor", phone: "+91 94461 25964", course: "English Typewriting", message: "Please share batch timings." };
function response() { return { statusCode: 200, body: null, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } }; }
test("validates required details, trims fields, and allows an optional message", () => {
  assert.equal(createEnquirySchema.parse({ ...input, name: " Test Visitor " }).name, "Test Visitor");
  assert.equal(createEnquirySchema.safeParse({ ...input, message: undefined }).success, true);
  for (const values of [{ name: "" }, { phone: "letters" }, { phone: "+..----" }, { course: " " }, { message: "x".repeat(501) }, { requestId: "invalid" }]) assert.equal(createEnquirySchema.safeParse({ ...input, ...values }).success, false);
});
test("public submission persists enquiry and returns only confirmation", async () => {
  let saved;
  prisma.enquiry.upsert = async ({ create }) => { saved = create; return { id: "test-id", ...create, status: "NEW" }; };
  const res = response();
  await createEnquiryController({ body: input }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(saved.name, input.name);
  assert.deepEqual(res.body.data, { id: "test-id" });
});
test("unchanged retry preserves the original record and rejects changed details", async () => {
  let stored;
  let count = 0;
  prisma.enquiry.upsert = async ({ create }) => { if (!stored) { stored = { id: "original", ...create }; count++; } return stored; };
  const first = await createEnquiry(input);
  assert.equal(await createEnquiry(input), first);
  assert.equal(count, 1);
  await assert.rejects(createEnquiry({ ...input, phone: "1234567890" }), /changed/);
});
test("failed writes do not claim successful submission; invalid details are rejected", async () => {
  prisma.enquiry.upsert = async () => { throw new Error("database unavailable"); };
  const log = console.error;
  console.error = () => {};
  try {
    const res = response();
    await createEnquiryController({ body: input }, res);
    assert.equal(res.statusCode, 500);
    assert.equal(res.body.success, false);
    const invalid = response();
    await createEnquiryController({ body: { ...input, name: "" } }, invalid);
    assert.equal(invalid.statusCode, 400);
  } finally { console.error = log; }
});
test("admin list and follow-up status expose saved requests", async () => {
  prisma.enquiry.findMany = async () => [{ id: input.requestId, ...input, status: "NEW" }];
  prisma.enquiry.update = async ({ where, data }) => ({ ...input, id: where.id, ...data });
  const list = response();
  await getEnquiriesController({}, list);
  assert.equal(list.body.data.enquiries[0].name, input.name);
  const update = response();
  await updateEnquiryController({ params: { id: input.requestId }, body: { status: "CONTACTED" } }, update);
  assert.equal(update.body.data.enquiry.status, "CONTACTED");
  const invalid = response();
  await updateEnquiryController({ params: { id: input.requestId }, body: { status: "INVALID" } }, invalid);
  assert.equal(invalid.statusCode, 400);
});
test("admin access requires an active, unexpired session", async () => {
  const anonymous = response();
  let continued = false;
  await requireAuthenticated({ cookies: {} }, anonymous, () => { continued = true; });
  assert.equal(anonymous.statusCode, 401);
  assert.equal(continued, false);
  prisma.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 10000), user: { isActive: true, role: "STAFF" } });
  await requireAuthenticated({ cookies: { session: "test" } }, response(), () => { continued = true; });
  assert.equal(continued, true);
  prisma.session.findUnique = async () => ({ expiresAt: new Date(0), user: { isActive: true, role: "ADMIN" } });
  const expired = response();
  await requireAuthenticated({ cookies: { session: "test" } }, expired, () => {});
  assert.equal(expired.statusCode, 401);
});
