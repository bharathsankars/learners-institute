import test from "node:test";
import assert from "node:assert/strict";
import { financialSummary, isOverdue, enquiryWeek, dashboardDateKey } from "../src/admin/utils/dashboard.ts";
const plan = { totalFeePaise: 10000, discountPaise: 1000, payments: [{ amountPaise: 3000 }], status: "ACTIVE", dueDate: "2026-10-09T00:00:00Z" };
test("financial summaries distinguish all collections from active balances", () => {
  const cancelled = { ...plan, status: "CANCELLED", payments: [{ amountPaise: 2000 }] };
  const summary = financialSummary([plan, cancelled], "2026-10-10");
  assert.deepEqual(summary, { collected: 5000, outstanding: 6000, overdue: 6000, effective: 9000, collectionPercent: 33 });
});
test("overdue ignores paid plans, future dates, missing dates, and cancelled plans", () => {
  assert.equal(isOverdue(plan, "2026-10-10"), true);
  for (const changes of [{ dueDate: "2026-10-10" }, { dueDate: "2026-10-11" }, { dueDate: null }, { status: "CANCELLED" }, { payments: [{ amountPaise: 9000 }] }]) assert.equal(isOverdue({ ...plan, ...changes }, "2026-10-10"), false);
  assert.equal(financialSummary([], "2026-10-10").collectionPercent, 0);
});
test("weekly activity includes today and handles dates at Berlin midnight", () => {
  assert.equal(dashboardDateKey(new Date("2026-10-09T22:30:00Z")), "2026-10-10");
  const days = enquiryWeek([{ createdAt: "2026-10-09T22:30:00Z" }, { createdAt: "2026-10-04T12:00:00Z" }, { createdAt: "2026-10-03T12:00:00Z" }], "2026-10-10");
  assert.equal(days.length, 7);
  assert.equal(days[0]?.key, "2026-10-04");
  assert.equal(days[0]?.count, 1);
  assert.equal(days[6]?.count, 1);
  assert.equal(days.reduce((sum, day) => sum + day.count, 0), 2);
});
