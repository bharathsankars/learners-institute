import test from "node:test";
import assert from "node:assert/strict";
import { placementToInput } from "../src/admin/utils/admissions.ts";

test("placement converts rupees to paise and validates fees", () => {
  const value = { courseIds: ["c1", "c2"], batchId: "", fees: { c1: { total: "4500", discount: "500", dueDate: "2026-12-01" }, c2: { total: "", discount: "", dueDate: "" } } };
  assert.deepEqual(placementToInput(value, true), { courseIds: ["c1", "c2"], batchId: null, fees: [{ courseId: "c1", totalFeePaise: 450000, discountPaise: 50000, dueDate: "2026-12-01" }] });
  assert.deepEqual(placementToInput(value, false), { courseIds: ["c1", "c2"], batchId: null, fees: [] });
  assert.deepEqual(placementToInput({ ...value, courseIds: [] }, true), { error: "Choose at least one course." });
  assert.ok("error" in placementToInput({ ...value, fees: { c1: { total: "100", discount: "200", dueDate: "" } } }, true));
  assert.ok("error" in placementToInput({ ...value, fees: { c1: { total: "0", discount: "", dueDate: "" } } }, true));
});
