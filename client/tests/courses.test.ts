import test from "node:test";
import assert from "node:assert/strict";
import { courseCounts, filterCourses, paginateCourses } from "../src/admin/utils/courses.ts";
const base = { shortDescription: null, description: null, updatedAt: "2026-10-10T12:00:00Z" };
const courses = [
  { ...base, id: "1", title: "Typewriting", slug: "typewriting", category: " Office ", skills: ["Typing accuracy"], isActive: true, displayOrder: 10, createdAt: "2026-10-08T12:00:00Z" },
  { ...base, id: "2", title: "Computer Training", slug: "computer-training", category: "Digital", skills: ["File management"], isActive: false, displayOrder: 2, createdAt: "2026-10-10T12:00:00Z" },
  { ...base, id: "3", title: "Shorthand", slug: "shorthand", category: null, skills: [], isActive: true, displayOrder: 2, createdAt: "2026-10-09T12:00:00Z" },
];
const criteria = { search: "", status: "ALL" as const, category: undefined, sort: "ORDER" as const };
test("summaries count availability and named categories", () => {
  assert.deepEqual(courseCounts(courses), { ALL: 3, ACTIVE: 2, INACTIVE: 1, CATEGORIES: 2 });
  assert.equal(courseCounts([{ ...courses[0]!, category: " " }]).CATEGORIES, 0);
});
test("search includes skills and combines with category and availability", () => {
  assert.equal(filterCourses(courses, { ...criteria, search: " TYPING ACCURACY ", category: "Office", status: "ACTIVE" })[0]?.id, "1");
  assert.equal(filterCourses(courses, { ...criteria, search: "file", status: "ACTIVE" }).length, 0);
  assert.equal(filterCourses(courses, { ...criteria, category: null })[0]?.id, "3");
});
test("sorts by numeric display order with title tie-breaks, title or date", () => {
  assert.deepEqual(filterCourses(courses, criteria).map(course => course.id), ["2", "3", "1"]);
  assert.deepEqual(filterCourses(courses, { ...criteria, sort: "TITLE" }).map(course => course.id), ["2", "3", "1"]);
  assert.deepEqual(filterCourses(courses, { ...criteria, sort: "NEWEST" }).map(course => course.id), ["2", "3", "1"]);
  assert.equal(courses[0]?.id, "1");
});
test("pagination stays valid when categories, statuses or deletions reduce results", () => {
  const records = Array.from({ length: 24 }, (_, index) => index);
  assert.deepEqual(paginateCourses(records, 3), { records: [20, 21, 22, 23], currentPage: 3, pageCount: 3, start: 21, end: 24 });
  assert.equal(paginateCourses([1], 3).currentPage, 1);
  assert.deepEqual(paginateCourses([], 3), { records: [], currentPage: 1, pageCount: 1, start: 0, end: 0 });
});
