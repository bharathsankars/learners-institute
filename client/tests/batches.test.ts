import test from "node:test";
import assert from "node:assert/strict";
import { batchCounts, batchSeatState, filterBatches, formatBatchDays, formatBatchDuration, formatBatchTime, formatBatchTiming, toTimeInput } from "../src/admin/utils/batches.ts";
import type { Batch } from "../src/api/batches.ts";

const base = { capacity: 15, studentCount: 0, isActive: true, instructor: null, createdAt: "", updatedAt: "", days: ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as Batch["days"] };
const batches: Batch[] = [
  { ...base, id: "1", name: "Evening B", startMinutes: 1050, endMinutes: 1110, studentCount: 15 },
  { ...base, id: "2", name: "Morning A", startMinutes: 420, endMinutes: 480, studentCount: 6, instructor: { id: "u", firstName: "Lakshmi", lastName: "Pillai" } },
  { ...base, id: "3", name: "Afternoon", startMinutes: 840, endMinutes: 930, isActive: false },
];

test("times format as 12-hour clock and round-trip to time inputs", () => {
  assert.equal(formatBatchTime(0), "12:00 AM");
  assert.equal(formatBatchTime(450), "7:30 AM");
  assert.equal(formatBatchTime(720), "12:00 PM");
  assert.equal(formatBatchTime(1050), "5:30 PM");
  assert.equal(formatBatchTiming({ startMinutes: 420, endMinutes: 510 }), "7:00 AM – 8:30 AM");
  assert.equal(formatBatchDuration({ startMinutes: 420, endMinutes: 510 }), "1 hr 30 min");
  assert.equal(formatBatchDuration({ startMinutes: 420, endMinutes: 480 }), "1 hr");
  assert.equal(formatBatchDuration({ startMinutes: 420, endMinutes: 465 }), "45 min");
  assert.equal(toTimeInput(450), "07:30");
});

test("days collapse consecutive runs and keep short gaps readable", () => {
  assert.equal(formatBatchDays(["MON", "TUE", "WED", "THU", "FRI", "SAT"]), "Mon–Sat");
  assert.equal(formatBatchDays(["MON", "WED", "FRI"]), "Mon, Wed, Fri");
  assert.equal(formatBatchDays(["SAT", "SUN"]), "Sat, Sun");
  assert.equal(formatBatchDays(["MON", "TUE", "WED", "SAT"]), "Mon–Wed, Sat");
  assert.equal(formatBatchDays(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]), "Every day");
});

test("seat state flags nearly full and full batches", () => {
  assert.equal(batchSeatState({ capacity: 15, studentCount: 6 }), "open");
  assert.equal(batchSeatState({ capacity: 15, studentCount: 13 }), "nearly");
  assert.equal(batchSeatState({ capacity: 15, studentCount: 15 }), "full");
  assert.equal(batchSeatState({ capacity: 1, studentCount: 0 }), "nearly");
});

test("counts, filters by status and instructor, and sorts by time, name or fullness", () => {
  assert.deepEqual(batchCounts(batches), { ALL: 3, ACTIVE: 2, ARCHIVED: 1 });
  const criteria = { search: "", status: "ALL" as const, sort: "TIME" as const };
  assert.deepEqual(filterBatches(batches, criteria).map((batch) => batch.id), ["2", "3", "1"]);
  assert.deepEqual(filterBatches(batches, { ...criteria, sort: "NAME" }).map((batch) => batch.id), ["3", "1", "2"]);
  assert.deepEqual(filterBatches(batches, { ...criteria, sort: "FULLEST" }).map((batch) => batch.id), ["1", "2", "3"]);
  assert.deepEqual(filterBatches(batches, { ...criteria, status: "ARCHIVED" }).map((batch) => batch.id), ["3"]);
  assert.deepEqual(filterBatches(batches, { ...criteria, search: " lakshmi " }).map((batch) => batch.id), ["2"]);
  assert.deepEqual(filterBatches(batches, { ...criteria, search: "mon–sat", status: "ACTIVE" }).length, 2);
});
