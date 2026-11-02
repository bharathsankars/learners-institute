import test from "node:test";
import assert from "node:assert/strict";
import { amountInWords, feeCounts, feeState, feeTotals, filterFeePlans, filterPayments, paymentTotals } from "../src/admin/utils/fees.ts";

const today = "2026-11-15";
const student = (firstName: string) => ({ firstName, lastName: null, admissionNumber: `LIT-${firstName}`, phone: "9446125964" });
const plan = (id: string, name: string, total: number, paid: number, due: string | null, status = "ACTIVE", discount = 0) => ({
  id, totalFeePaise: total, discountPaise: discount, payments: paid ? [{ amountPaise: paid }] : [], dueDate: due, status, createdAt: `2026-10-${id.padStart(2, "0")}`,
  enrollment: { student: student(name), course: { title: name === "Anjali" ? "KGTE English" : "Shorthand" } },
}) as never;

const plans = [
  plan("1", "Anjali", 450000, 200000, "2026-11-01"),
  plan("2", "Rahul", 380000, 380000, "2026-10-10"),
  plan("3", "Sneha", 420000, 0, "2026-12-01", "ACTIVE", 20000),
  plan("4", "Meera", 300000, 50000, null, "CANCELLED"),
];

test("fee state distinguishes overdue, due, paid and cancelled", () => {
  assert.deepEqual(plans.map((item) => feeState(item, today)), ["OVERDUE", "PAID", "DUE", "CANCELLED"]);
  assert.deepEqual(feeCounts(plans, today), { ALL: 4, OUTSTANDING: 2, OVERDUE: 1, PAID: 1, CANCELLED: 1 });
});

test("totals use effective fees for active plans and keep collections from cancelled ones", () => {
  assert.deepEqual(feeTotals(plans, today), { billed: 450000 + 380000 + 400000, collected: 630000, outstanding: 250000 + 400000, overdue: 250000, overdueCount: 1 });
});

test("filters by state and search; sorts by due date, balance or name", () => {
  const criteria = { search: "", filter: "ALL" as const, sort: "DUE" as const };
  assert.deepEqual(filterFeePlans(plans, criteria, today).map((item: { id: string }) => item.id), ["2", "1", "3", "4"]);
  assert.deepEqual(filterFeePlans(plans, { ...criteria, sort: "BALANCE" }, today).map((item: { id: string }) => item.id), ["3", "1", "4", "2"]);
  assert.deepEqual(filterFeePlans(plans, { ...criteria, filter: "OUTSTANDING" }, today).map((item: { id: string }) => item.id), ["1", "3"]);
  assert.deepEqual(filterFeePlans(plans, { ...criteria, search: "shorthand", filter: "OVERDUE" }, today).length, 0);
  assert.deepEqual(filterFeePlans(plans, { ...criteria, search: "kgte" }, today).map((item: { id: string }) => item.id), ["1"]);
});

test("payment totals and filters by day, month and method", () => {
  const payment = (id: string, day: string, amount: number, method: string) => ({ id, receiptNumber: Number(id), paidAt: `${day}T00:00:00.000Z`, amountPaise: amount, method, reference: null, feePlan: { enrollment: { student: student("Anjali"), course: { title: "KGTE English" } } } }) as never;
  const payments = [payment("1", "2026-11-15", 100000, "CASH"), payment("2", "2026-11-02", 50000, "UPI"), payment("3", "2026-10-30", 20000, "CASH")];
  assert.deepEqual(paymentTotals(payments, today), { today: 100000, todayCount: 1, month: 150000, monthCount: 2, all: 170000, allCount: 3 });
  assert.equal(filterPayments(payments, { search: "", period: "MONTH", method: "CASH" }, today).length, 1);
  assert.equal(filterPayments(payments, { search: "lci-000003", period: "ALL", method: "" }, today).length, 1);
});

test("amounts read out in Indian words", () => {
  assert.equal(amountInWords(450000), "Rupees Four Thousand Five Hundred Only");
  assert.equal(amountInWords(452050), "Rupees Four Thousand Five Hundred Twenty and Fifty Paise Only");
  assert.equal(amountInWords(12345600), "Rupees One Lakh Twenty Three Thousand Four Hundred Fifty Six Only");
  assert.equal(amountInWords(1500000000), "Rupees One Crore Fifty Lakh Only");
  assert.equal(amountInWords(100), "Rupees One Only");
  assert.equal(amountInWords(0), "Rupees Zero Only");
});
