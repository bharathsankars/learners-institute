import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../dist/src/config/database.js";
import { createPayment, PaymentError } from "../dist/src/services/payment.service.js";
import { createPaymentSchema } from "../dist/src/validators/payment.validator.js";
const input = { requestId: "e9a09b93-1bc2-4e99-9590-04aeb8e97981", feePlanId: "bd5c01ce-6d56-4b87-bec0-861e10485fe5", amountPaise: 5000, method: "CASH", paidAt: "2026-10-10" };
function mock({ plan = { id: input.feePlanId, status: "ACTIVE", totalFeePaise: 10000, discountPaise: 1000 }, paid = 0, existing = null } = {}) {
  let created = 0;
  const tx = { $queryRaw: async () => [], feePlan: { findUnique: async () => plan }, payment: { findUnique: async () => existing, aggregate: async () => ({ _sum: { amountPaise: paid } }), create: async ({ data }) => { created++; return data; } } };
  prisma.$transaction = async callback => callback(tx);
  return () => created;
}
test("accepts partial payment and rejects overpayment after discount and prior collections", async () => {
  const count = mock({ paid: 3000 });
  await createPayment(input);
  assert.equal(count(), 1);
  await assert.rejects(createPayment({ ...input, amountPaise: 6001 }), PaymentError);
  assert.equal(count(), 1);
});
test("rejects cancelled and missing plans", async () => {
  mock({ plan: { status: "CANCELLED" } });
  await assert.rejects(createPayment(input), /cancelled/);
  mock({ plan: null });
  await assert.rejects(createPayment(input), /not found/);
});
test("retries return the original receipt and changed submissions are rejected", async () => {
  const existing = { ...input, paidAt: new Date("2026-10-10T00:00:00Z"), receiptNumber: 1 };
  const count = mock({ existing });
  assert.equal(await createPayment(input), existing);
  assert.equal(count(), 0);
  await assert.rejects(createPayment({ ...input, amountPaise: 4000 }), /already used/);
});
test("validates money and actual calendar dates", () => {
  assert.equal(createPaymentSchema.safeParse(input).success, true);
  for (const value of [{ amountPaise: 0 }, { amountPaise: -1 }, { amountPaise: 1.5 }, { amountPaise: 2147483648 }, { paidAt: "2026-02-30" }, { paidAt: "invalid" }]) assert.equal(createPaymentSchema.safeParse({ ...input, ...value }).success, false);
});

test("fee edits cannot reduce the amount owed below existing collections", async () => {
  const { updateFeePlan } = await import("../dist/src/services/fee.service.js");
  mock({ paid: 8000 });
  await assert.rejects(updateFeePlan(input.feePlanId, { totalFeePaise: 10000, discountPaise: 3000, status: "ACTIVE" }), /less than payments/);
});

test("financial APIs reject missing sessions and non-super-admin users", async () => {
  const { requireSuperAdmin } = await import("../dist/src/middleware/session.js");
  let status;
  let continued = false;
  const res = { status(value) { status = value; return this; }, json() {} };
  await requireSuperAdmin({ cookies: {} }, res, () => { continued = true; });
  assert.equal(status, 401);
  prisma.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 10000), user: { isActive: true, role: "STAFF" } });
  await requireSuperAdmin({ cookies: { session: "test" } }, res, () => { continued = true; });
  assert.equal(status, 403);
  assert.equal(continued, false);
  prisma.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 10000), user: { isActive: true, role: "SUPER_ADMIN" } });
  await requireSuperAdmin({ cookies: { session: "test" } }, res, () => { continued = true; });
  assert.equal(continued, true);
});
