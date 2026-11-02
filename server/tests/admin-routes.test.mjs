import test from "node:test";
import assert from "node:assert/strict";
import { app } from "../dist/src/app.js";
import { prisma } from "../dist/src/config/database.js";

// Exercise the actual Express routing without a network listener or database writes.
function request(method, path, token) {
  return new Promise((resolve, reject) => {
    const req = { method, url: path, originalUrl: path, headers: token ? { cookie: `session=${token}` } : {}, body: {}, socket: {}, on() {}, unpipe() {} };
    const res = { headers: {}, statusCode: 200, setHeader(name, value) { this.headers[name] = value; }, getHeader(name) { return this.headers[name]; }, removeHeader(name) { delete this.headers[name]; }, end(body) { resolve({ status: this.statusCode, body: body ? JSON.parse(body) : null }); } };
    app.handle(req, res, reject);
  });
}
const id = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
const protectedRoutes = [
  ["POST", `/api/enquiries/${id}/admit`],
  ["GET", "/api/students"], ["POST", "/api/students"],
  ["PATCH", `/api/students/${id}`], ["DELETE", `/api/students/${id}`],
  ["GET", `/api/students/${id}/enrollments`],
  ["POST", `/api/students/${id}/enrollments`],
  ["GET", "/api/courses"], ["GET", `/api/courses/${id}`],
  ["POST", "/api/courses"], ["PATCH", `/api/courses/${id}`], ["DELETE", `/api/courses/${id}`],
  ["GET", "/api/batches"], ["GET", "/api/batches/instructors"], ["POST", "/api/batches"],
  ["PATCH", `/api/batches/${id}`], ["DELETE", `/api/batches/${id}`],
  ["GET", `/api/batches/${id}/students`], ["POST", `/api/batches/${id}/students`],
  ["DELETE", `/api/batches/${id}/students/${id}`],
  ["POST", "/api/admissions"],
];

test("every student and admin course endpoint rejects missing, invalid, expired and inactive sessions", async () => {
  const original = prisma.session.findUnique;
  try {
    for (const state of ["missing", "invalid", "expired", "inactive"]) {
      prisma.session.findUnique = async () => state === "invalid" ? null : { expiresAt: new Date(state === "expired" ? 0 : Date.now() + 60000), user: { isActive: state !== "inactive", role: "STAFF" } };
      for (const [method, path] of protectedRoutes) {
        const response = await request(method, path, state === "missing" ? undefined : "test-session");
        assert.equal(response.status, 401, `${state}: ${method} ${path}`);
        assert.equal(response.body.success, false);
      }
    }
  } finally { prisma.session.findUnique = original; }
});

test("active staff, admin and super admin sessions can access student and course lists", async () => {
  const originals = [prisma.session.findUnique, prisma.student.findMany, prisma.course.findMany];
  try {
    prisma.student.findMany = async () => [];
    prisma.course.findMany = async () => [];
    for (const role of ["STAFF", "ADMIN", "SUPER_ADMIN"]) {
      prisma.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 60000), user: { isActive: true, role } });
      for (const path of ["/api/students", "/api/courses"]) assert.equal((await request("GET", path, "valid-session")).status, 200, role);
      // An authenticated write reaches validation for admins; lecturers (STAFF) are refused.
      for (const path of ["/api/students", "/api/courses"]) assert.equal((await request("POST", path, "valid-session")).status, role === "STAFF" ? 403 : 400, role);
    }
  } finally { [prisma.session.findUnique, prisma.student.findMany, prisma.course.findMany] = originals; }
});

test("public courses remain accessible anonymously and query only active records in display order", async () => {
  const original = prisma.course.findMany;
  try {
    prisma.course.findMany = async options => {
      assert.deepEqual(options.where, { isActive: true });
      assert.deepEqual(options.orderBy, [{ displayOrder: "asc" }, { title: "asc" }]);
      return [{ id, title: "Public course", isActive: true }];
    };
    const response = await request("GET", "/api/courses/public");
    assert.equal(response.status, 200);
    assert.equal(response.body.data.courses[0].title, "Public course");
  } finally { prisma.course.findMany = original; }
});

test("activity, exports and user tools are Super Admin only; the institute profile is public", async () => {
  const original = prisma.session.findUnique;
  try {
    prisma.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 60000), user: { isActive: true, role: "ADMIN" } });
    for (const [method, path] of [["GET", "/api/activity"], ["GET", "/api/exports/students"], ["POST", `/api/admin-users/${id}/reset-password`], ["DELETE", `/api/admin-users/${id}/sessions`]]) {
      const response = await request(method, path, "test-session");
      assert.equal(response.status, 403, `${method} ${path}`);
    }
  } finally { prisma.session.findUnique = original; }

  const findFirst = prisma.instituteSetting.findFirst;
  try {
    prisma.instituteSetting.findFirst = async () => ({ id: "x", instituteName: "Learners", phone: "+91 94461 25964", whatsapp: null, email: null, address: "Kottayam", mapsUrl: null, createdAt: new Date(), updatedAt: new Date() });
    const response = await request("GET", "/api/institute");
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(response.body.data.institute).sort(), ["address", "email", "instituteName", "mapsUrl", "phone", "whatsapp"]);
  } finally { prisma.instituteSetting.findFirst = findFirst; }
});

test("lecturers (STAFF) can view and admit but cannot change the register, courses or batches", async () => {
  const original = prisma.session.findUnique;
  try {
    prisma.session.findUnique = async () => ({ expiresAt: new Date(Date.now() + 60000), user: { id: "lecturer", isActive: true, role: "STAFF" } });
    for (const [method, path] of [
      ["POST", "/api/students"], ["PATCH", `/api/students/${id}`], ["POST", `/api/students/${id}/enrollments`],
      ["GET", "/api/students/import/template"], ["POST", "/api/students/import/preview"],
      ["POST", "/api/courses"], ["PATCH", `/api/courses/${id}`], ["DELETE", `/api/courses/${id}`],
      ["PATCH", `/api/enquiries/${id}`],
      ["GET", "/api/batches/instructors"], ["POST", "/api/batches"], ["PATCH", `/api/batches/${id}`], ["DELETE", `/api/batches/${id}`],
      ["POST", `/api/batches/${id}/students`], ["DELETE", `/api/batches/${id}/students/${id}`],
    ]) {
      const response = await request(method, path, "test-session");
      assert.equal(response.status, 403, `${method} ${path}`);
      assert.match(response.body.message, /Lecturer/);
    }
  } finally { prisma.session.findUnique = original; }
});
