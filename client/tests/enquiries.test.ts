import test from "node:test";
import assert from "node:assert/strict";
import { enquiryCounts, filterEnquiries, paginateEnquiries } from "../src/admin/utils/enquiries.ts";
const records = [
  { name: "Alice", phone: "+91 94461 25964", course: "Typewriting", message: "Morning batch?", status: "NEW" as const, createdAt: "2026-10-08T10:00:00Z" },
  { name: "Bob", phone: "1234567890", course: "Computer Training", message: null, status: "CLOSED" as const, createdAt: "2026-10-10T10:00:00Z" },
  { name: "Carol", phone: "9876543210", course: "Typewriting", message: "Fees please", status: "CONTACTED" as const, createdAt: "2026-10-09T10:00:00Z" },
];
const criteria = { search: "", status: "ALL" as const, course: "", sort: "NEWEST" as const };
test("summary counts remain based on the complete inbox", () => {
  assert.deepEqual(enquiryCounts(records), { ALL: 3, NEW: 1, CONTACTED: 1, CLOSED: 1 });
  assert.deepEqual(enquiryCounts([]), { ALL: 0, NEW: 0, CONTACTED: 0, CLOSED: 0 });
});
test("combines status, course and case-insensitive message searches", () => {
  assert.deepEqual(filterEnquiries(records, { ...criteria, status: "NEW", course: "Typewriting", search: " MORNING " }).map(record => record.name), ["Alice"]);
  assert.equal(filterEnquiries(records, { ...criteria, status: "CLOSED", course: "Typewriting" }).length, 0);
  assert.equal(filterEnquiries(records, { ...criteria, search: "not found" }).length, 0);
});
test("finds formatted phone numbers and handles optional messages", () => {
  assert.equal(filterEnquiries(records, { ...criteria, search: "9446125964" })[0]?.name, "Alice");
  assert.equal(filterEnquiries(records, { ...criteria, search: "bob" })[0]?.name, "Bob");
});
test("sorts by date or follow-up priority without changing source order", () => {
  assert.deepEqual(filterEnquiries(records, criteria).map(record => record.name), ["Bob", "Carol", "Alice"]);
  assert.deepEqual(filterEnquiries(records, { ...criteria, sort: "OLDEST" }).map(record => record.name), ["Alice", "Carol", "Bob"]);
  assert.deepEqual(filterEnquiries(records, { ...criteria, sort: "NEW_FIRST" }).map(record => record.name), ["Alice", "Carol", "Bob"]);
  assert.equal(records[0]?.name, "Alice");
});
test("pagination clamps the page after filters or status changes reduce results", () => {
  const list = Array.from({ length: 23 }, (_, index) => index);
  assert.deepEqual(paginateEnquiries(list, 3), { records: [20, 21, 22], currentPage: 3, pageCount: 3, start: 21, end: 23 });
  assert.equal(paginateEnquiries([1], 3).currentPage, 1);
  assert.deepEqual(paginateEnquiries([], 3), { records: [], currentPage: 1, pageCount: 1, start: 0, end: 0 });
});


test("filters multi-course enquiries by each individual course", () => {
  const multiCourse = {
    name: "FDE Test Student",
    phone: "9876543210",
    course: "English Typewriting - Lower, Computer Basics",
    message: "Testing multi-course enquiry filtering",
    status: "NEW" as const,
    createdAt: "2026-10-26T12:00:00Z",
  };

  const data = [...records, multiCourse];

  for (const course of [
    "English Typewriting - Lower",
    "Computer Basics",
  ]) {
    const result = filterEnquiries(data, {
      ...criteria,
      course,
    });

    assert.ok(
      result.some(record => record.name === "FDE Test Student"),
      `Expected enquiry to match ${course}`,
    );
  }

  const unrelated = filterEnquiries(data, {
    ...criteria,
    course: "Microsoft 365",
  });

  assert.ok(
    !unrelated.some(record => record.name === "FDE Test Student"),
  );
});
