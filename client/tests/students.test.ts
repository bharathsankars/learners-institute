import test from "node:test";
import assert from "node:assert/strict";
import { filterStudents, paginateStudents, studentCounts, studentDate, studentName } from "../src/admin/utils/students.ts";
const base = { phone: "+91 94461 25964", email: null, dateOfBirth: null, gender: null, address: null, updatedAt: "2026-10-10T12:00:00Z" };
const students = [
  { ...base, id: "1", firstName: "Alice", lastName: null, admissionNumber: "LCI-2", status: "ACTIVE" as const, createdAt: "2026-10-08T12:00:00Z" },
  { ...base, id: "2", firstName: "Bob", lastName: "Thomas", email: "bob@example.invalid", admissionNumber: "LCI-10", status: "INACTIVE" as const, createdAt: "2026-10-10T12:00:00Z" },
  { ...base, id: "3", firstName: "Carol", lastName: "James", admissionNumber: "LCI-1", status: "COMPLETED" as const, createdAt: "2026-10-09T12:00:00Z" },
];
const criteria = { search: "", status: "ALL" as const, sort: "NEWEST" as const };
test("summaries include all learning statuses and empty registers", () => {
  assert.deepEqual(studentCounts(students), { ALL: 3, ACTIVE: 1, INACTIVE: 1, COMPLETED: 1 });
  assert.equal(studentCounts([]).ALL, 0);
});
test("search combines with status and handles missing optional fields", () => {
  assert.equal(studentName(students[0]!), "Alice");
  assert.equal(filterStudents(students, { ...criteria, search: " BOB@EXAMPLE " })[0]?.id, "2");
  assert.equal(filterStudents(students, { ...criteria, search: "9446125964", status: "ACTIVE" })[0]?.id, "1");
  assert.equal(filterStudents(students, { ...criteria, search: "alice", status: "INACTIVE" }).length, 0);
  assert.equal(filterStudents(students, { ...criteria, search: "LCI-1" }).length, 2);
});
test("sorts names, dates and admission numbers without modifying input", () => {
  assert.deepEqual(filterStudents(students, criteria).map(student => student.id), ["2", "3", "1"]);
  assert.deepEqual(filterStudents(students, { ...criteria, sort: "OLDEST" }).map(student => student.id), ["1", "3", "2"]);
  assert.deepEqual(filterStudents(students, { ...criteria, sort: "NAME" }).map(student => student.id), ["1", "2", "3"]);
  assert.deepEqual(filterStudents(students, { ...criteria, sort: "ADMISSION" }).map(student => student.id), ["3", "1", "2"]);
  assert.equal(students[0]?.id, "1");
});
test("pagination remains valid after filters and deletions", () => {
  const records = Array.from({ length: 21 }, (_, index) => index);
  assert.deepEqual(paginateStudents(records, 3), { records: [20], currentPage: 3, pageCount: 3, start: 21, end: 21 });
  assert.equal(paginateStudents([1], 3).currentPage, 1);
  assert.deepEqual(paginateStudents([], 3), { records: [], currentPage: 1, pageCount: 1, start: 0, end: 0 });
});
test("birth dates stay on their stored calendar day", () => {
  assert.equal(studentDate("2000-01-01T00:00:00Z", true), "1 Jan 2000");
});
