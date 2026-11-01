/*
 * Live confirmation tests. They commit real rows, so they run only against
 * a dedicated disposable database (learners_institute_import_test) on the
 * local Docker server, created and migrated on demand. The development
 * register is never written to, and nothing is deleted as cleanup: each run
 * uses unique names, phones and course slugs.
 */
import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import pg from "pg";

const config = {};
dotenv.config({ processEnv: config, quiet: true });

const base = new URL(config.DATABASE_URL ?? process.env.DATABASE_URL ?? "");

if (!["localhost", "127.0.0.1"].includes(base.hostname) || base.port !== "5433") {
  throw new Error("Live import tests are restricted to the local database on port 5433.");
}

const TEST_DB = "learners_institute_import_test";
const testUrl = new URL(base);
testUrl.pathname = `/${TEST_DB}`;
const maintenanceUrl = new URL(base);
maintenanceUrl.pathname = "/postgres";

const HEADERS = ["Student Name", "Phone", "Email", "DOB (DD-MM-YYYY)", "Courses Enrolled", "Address"];
const tag = randomBytes(4).toString("hex");
let phoneSeed = Number.parseInt(tag, 16) % 9_000_000;
const nextPhone = () => `9${String(phoneSeed++ % 9_000_000).padStart(9, "0")}`;

let prisma, server, baseUrl, db;
let staffCookie, staffUser, recoveryCookie;
const course = {};

async function ensureTestDatabase() {
  const admin = new pg.Client({ connectionString: maintenanceUrl.toString() });
  await admin.connect();
  try {
    const { rowCount } = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [TEST_DB]);
    if (!rowCount) await admin.query(`CREATE DATABASE ${TEST_DB}`);
  } finally {
    await admin.end();
  }
  const env = { ...process.env, DATABASE_URL: testUrl.toString() };
  delete env.DIRECT_URL;
  execFileSync("npx", ["prisma", "migrate", "deploy", "--config", "prisma7.config.ts"], { env, stdio: "pipe" });
}

async function workbook(rows) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Students");
  sheet.addRow(HEADERS);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await book.xlsx.writeBuffer());
}

async function confirm(buffer, { requestId = randomUUID(), cookie = staffCookie } = {}) {
  const body = new FormData();
  if (requestId) body.append("requestId", requestId);
  body.append("file", new Blob([buffer]), "students.xlsx");
  const response = await fetch(`${baseUrl}/api/students/import/confirm`, {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body,
  });
  return { status: response.status, body: await response.json(), requestId };
}

async function snapshot() {
  const { rows } = await db.query(`
    SELECT
      (SELECT COUNT(*)::int FROM students) AS students,
      (SELECT COUNT(*)::int FROM enrollments) AS enrollments,
      (SELECT COUNT(*)::int FROM fee_plans) AS "feePlans",
      (SELECT COUNT(*)::int FROM users) AS users,
      (SELECT COUNT(*)::int FROM student_import_batches) AS batches,
      (SELECT "lastNumber"::int FROM student_admission_counter WHERE id = 1) AS counter`);
  return rows[0];
}

let sessionSeq = 0;

async function createSession(role) {
  const name = `import-${role}-${tag}-${sessionSeq++}`.toLowerCase();
  const user = await prisma.user.create({
    data: { firstName: "Import", lastName: role, username: name, email: `${name}@example.invalid`, password: "not-a-real-hash", role },
  });
  return { cookie: await sessionFor(user.id), user };
}

async function sessionFor(userId) {
  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { tokenHash: createHash("sha256").update(token).digest("hex"), userId, expiresAt: new Date(Date.now() + 3_600_000) },
  });
  return `session=${token}`;
}

let preserved;

before(async () => {
  await ensureTestDatabase();
  process.env.DATABASE_URL = testUrl.toString();
  ({ prisma } = await import("../dist/src/config/database.js"));
  const { app } = await import("../dist/src/app.js");

  db = new pg.Client({ connectionString: testUrl.toString() });
  await db.connect();

  // Fails any enrollment for a "rollback probe" course, forcing a mid-batch error.
  await db.query(`
    CREATE OR REPLACE FUNCTION import_test_fail_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF EXISTS (SELECT 1 FROM courses WHERE id = NEW."courseId" AND slug LIKE 'import-test-rollback-%') THEN
        RAISE EXCEPTION 'Simulated enrollment failure';
      END IF;
      RETURN NEW;
    END $$;
    DROP TRIGGER IF EXISTS import_test_fail_enrollment ON enrollments;
    CREATE TRIGGER import_test_fail_enrollment BEFORE INSERT ON enrollments
      FOR EACH ROW EXECUTE FUNCTION import_test_fail_enrollment();`);

  const make = (key, title, isActive = true, slug = `import-test-${key}-${tag}`) =>
    prisma.course.create({ data: { title, slug, isActive } }).then((created) => { course[key] = created; });
  await make("tally", `Tally ${tag}`);
  await make("python", `Python ${tag}`);
  await make("retired", `Retired ${tag}`, false);
  await make("twinA", `Twin ${tag}`);
  await make("twinB", `Twin ${tag}`, true, `import-test-twin-b-${tag}`);
  await make("probe", `Probe ${tag}`, true, `import-test-rollback-${tag}`);

  // A pre-existing student that must survive every scenario untouched.
  preserved = await prisma.student.create({
    data: { firstName: `Existing Student ${tag}`, phone: `+91 ${nextPhone()}`, email: `existing-${tag}@example.invalid` },
  });

  staffCookie = (await createSession("STAFF")).cookie;
  recoveryCookie = (await createSession("RECOVERY_ADMIN")).cookie;

  // The per-user rate limit uses the default memory store; each test signs in
  // as its own staff user so the suite does not exhaust one budget.
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

beforeEach(async () => {
  ({ cookie: staffCookie, user: staffUser } = await createSession("STAFF"));
});

after(async () => {
  // The pre-existing record must be byte-for-byte unchanged.
  const current = await prisma.student.findUnique({ where: { id: preserved.id } });
  assert.deepEqual(current, preserved);
  server?.close();
  await db?.end();
  await prisma?.$disconnect();
});

function lit(number) {
  return `LIT${String(number).padStart(3, "0")}`;
}

test("imports multiple students with multiple courses and consecutive LIT numbers", async () => {
  const before = await snapshot();
  const rows = [
    [`Anu Krishnan ${tag}`, nextPhone(), `anu-${tag}@Example.invalid`, "21-08-2005", `Tally ${tag}, python ${tag}`, "Palakkad"],
    [`Basil Joseph ${tag}`, nextPhone(), "", "", `Tally ${tag}`, ""],
    [`Chitra Menon ${tag}`, nextPhone(), "", "01-01-2001", "", "Kochi"],
  ];
  const result = await confirm(await workbook(rows));

  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.equal(result.body.data.replayed, false);
  assert.equal(result.body.data.studentCount, 3);
  assert.equal(result.body.data.enrollmentCount, 3);
  assert.deepEqual(
    result.body.data.students.map((student) => student.admissionNumber),
    [lit(before.counter + 1), lit(before.counter + 2), lit(before.counter + 3)],
  );
  assert.deepEqual(result.body.data.students.map((student) => student.rowNumber), [2, 3, 4]);

  const after = await snapshot();
  assert.equal(after.students, before.students + 3);
  assert.equal(after.enrollments, before.enrollments + 3);
  assert.equal(after.counter, before.counter + 3);
  assert.equal(after.batches, before.batches + 1);
  // No login accounts or fee plans are created.
  assert.equal(after.users, before.users);
  assert.equal(after.feePlans, before.feePlans);

  const anu = await prisma.student.findUnique({
    where: { id: result.body.data.students[0].id },
    include: { enrollments: { include: { course: true, feePlan: true } } },
  });
  assert.equal(anu.firstName, `Anu Krishnan ${tag}`);
  assert.equal(anu.email, `anu-${tag}@example.invalid`);
  assert.equal(anu.dateOfBirth.toISOString().slice(0, 10), "2005-08-21");
  assert.equal(anu.status, "ACTIVE");
  assert.deepEqual(anu.enrollments.map((e) => e.course.id).sort(), [course.tally.id, course.python.id].sort());
  assert.ok(anu.enrollments.every((e) => e.status === "ACTIVE" && e.feePlan === null));

  const batch = await prisma.studentImportBatch.findUnique({ where: { requestId: result.requestId } });
  assert.equal(batch.studentCount, 3);
  assert.ok(batch.importedById, "importing user is recorded");
});

test("retries with the same request ID replay the original result without new records", async () => {
  const buffer = await workbook([[`Retry Student ${tag}`, nextPhone(), "", "", `Python ${tag}`, ""]]);
  const first = await confirm(buffer);
  assert.equal(first.status, 201);
  const before = await snapshot();

  const retry = await confirm(buffer, { requestId: first.requestId });
  assert.equal(retry.status, 200);
  assert.equal(retry.body.data.replayed, true);
  assert.equal(retry.body.data.batchId, first.body.data.batchId);
  assert.deepEqual(retry.body.data.students, first.body.data.students);
  assert.deepEqual(await snapshot(), before);

  // The same request ID cannot be reused for a different workbook.
  const other = await confirm(await workbook([[`Other Student ${tag}`, nextPhone(), "", "", "", ""]]), { requestId: first.requestId });
  assert.equal(other.status, 409);
  assert.match(other.body.message, /different workbook/);

  // Re-uploading the identical workbook under a new request ID is refused.
  const again = await confirm(buffer);
  assert.equal(again.status, 409);
  assert.match(again.body.message, /already imported/);
  assert.deepEqual(await snapshot(), before);
});

test("students already in the register block the batch", async () => {
  const before = await snapshot();
  const phone = preserved.phone.replace(/\D/g, "").slice(-10);
  for (const row of [
    // Same name, phone written differently.
    [`  existing   student ${tag}`, phone, "", "", "", ""],
    // Same name, new phone, same email.
    [`Existing Student ${tag}`, nextPhone(), `EXISTING-${tag}@example.invalid`, "", "", ""],
  ]) {
    const result = await confirm(await workbook([[`Fresh Student ${tag} ${nextPhone()}`, nextPhone(), "", "", "", ""], row]));
    assert.equal(result.status, 409);
    assert.equal(result.body.data.preview.eligible, false);
    assert.match(result.body.data.preview.rows[1].warnings.join(" "), new RegExp(`Possible existing student: ${preserved.admissionNumber}`));
  }
  assert.deepEqual(await snapshot(), before, "nothing imported, not even the fresh row");

  // A sibling with the family phone and email is not a duplicate.
  const sibling = await confirm(await workbook([[`Sibling Of Existing ${tag}`, phone, `existing-${tag}@example.invalid`, "", "", ""]]));
  assert.equal(sibling.status, 201, JSON.stringify(sibling.body));
});

test("duplicates inside the spreadsheet block the batch, but shared family phones do not", async () => {
  const before = await snapshot();
  const phone = nextPhone();
  const duplicated = await confirm(await workbook([
    [`Twin Row ${tag}`, phone, "", "", "", ""],
    [`twin  row ${tag}`, `+91 ${phone}`, "", "", "", ""],
  ]));
  assert.equal(duplicated.status, 409);
  assert.match(duplicated.body.data.preview.rows[1].warnings[0], /duplicate of spreadsheet row 2/);
  assert.deepEqual(await snapshot(), before);

  const family = nextPhone();
  const siblings = await confirm(await workbook([
    [`Sibling One ${tag}`, family, "", "", "", ""],
    [`Sibling Two ${tag}`, family, "", "", "", ""],
  ]));
  assert.equal(siblings.status, 201, JSON.stringify(siblings.body));
  assert.equal(siblings.body.data.studentCount, 2);
});

test("invalid records and unknown, inactive or ambiguous courses reject the whole batch", async () => {
  const before = await snapshot();
  const good = () => [`Valid Student ${tag} ${nextPhone()}`, nextPhone(), "", "", `Tally ${tag}`, ""];
  const cases = [
    [["A", "123", "not-an-email", "", "", ""], /firstName|phone|email/],
    [[`Bad Date ${tag}`, nextPhone(), "", "31-02-2004", "", ""], /Invalid calendar date/],
    [[`Unknown Course ${tag}`, nextPhone(), "", "", `Nonexistent ${tag}`, ""], /Unknown course/],
    [[`Inactive Course ${tag}`, nextPhone(), "", "", `Retired ${tag}`, ""], /Inactive course/],
    [[`Ambiguous Course ${tag}`, nextPhone(), "", "", `Twin ${tag}`, ""], /Ambiguous course/],
    [[`Repeat Course ${tag}`, nextPhone(), "", "", `Tally ${tag}, TALLY ${tag}`, ""], /Duplicate course selection/],
  ];
  for (const [row, message] of cases) {
    const result = await confirm(await workbook([good(), row]));
    assert.equal(result.status, 409, String(message));
    assert.equal(result.body.data.preview.invalidRows, 1);
    assert.match(result.body.data.preview.rows[1].errors.join(" "), message);
  }
  assert.deepEqual(await snapshot(), before);
});

test("a course deactivated after preview is rechecked at confirmation", async () => {
  const late = await prisma.course.create({ data: { title: `Late ${tag}`, slug: `import-test-late-${tag}` } });
  const buffer = await workbook([[`Late Course Student ${tag}`, nextPhone(), "", "", `Late ${tag}`, ""]]);
  const { previewStudentImport } = await import("../dist/src/services/student-import-preview.service.js");
  assert.equal((await previewStudentImport(buffer)).eligible, true);

  await prisma.course.update({ where: { id: late.id }, data: { isActive: false } });
  const before = await snapshot();
  const result = await confirm(buffer);
  assert.equal(result.status, 409);
  assert.match(result.body.data.preview.rows[0].errors[0], /Inactive course/);
  assert.deepEqual(await snapshot(), before);
});

test("a failure mid-batch rolls back every student and admission number", async () => {
  const before = await snapshot();
  const names = [`Rollback One ${tag}`, `Rollback Two ${tag}`];
  const result = await confirm(await workbook([
    [names[0], nextPhone(), "", "", `Tally ${tag}`, ""],
    [names[1], nextPhone(), "", "", `Probe ${tag}`, ""],
  ]));
  assert.equal(result.status, 500);
  assert.match(result.body.message, /no students were saved/);
  assert.deepEqual(await snapshot(), before, "students, enrollments, batch and LIT counter rolled back");
  const { rowCount } = await db.query('SELECT 1 FROM students WHERE "firstName" = ANY($1)', [names]);
  assert.equal(rowCount, 0);
});

test("concurrent confirmations cannot create duplicate students", async () => {
  // Same students in two different files, submitted at the same time.
  const phone = nextPhone();
  const files = await Promise.all(["Kochi", "Thrissur"].map((address) =>
    workbook([[`Race Student ${tag}`, phone, "", "", `Tally ${tag}`, address]])));
  const before = await snapshot();
  const results = await Promise.all(files.map((file) => confirm(file)));
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409], JSON.stringify(results.map((r) => r.body)));
  const loser = results.find((r) => r.status === 409);
  const winner = results.find((r) => r.status === 201);
  assert.match(loser.body.data.preview.rows[0].warnings[0], new RegExp(`Possible existing student: ${winner.body.data.students[0].admissionNumber}`));
  const after = await snapshot();
  assert.equal(after.students, before.students + 1);
  assert.equal(after.counter, before.counter + 1);

  // The same request submitted several times at once yields a single batch.
  const buffer = await workbook([[`Double Click ${tag}`, nextPhone(), "", "", "", ""]]);
  const requestId = randomUUID();
  const clicks = await Promise.all([1, 2, 3].map(() => confirm(buffer, { requestId })));
  assert.ok(clicks.every((r) => r.status === 200 || r.status === 201), JSON.stringify(clicks.map((r) => r.body)));
  assert.equal(clicks.filter((r) => r.body.data.replayed === false).length, 1);
  assert.equal(new Set(clicks.map((r) => r.body.data.batchId)).size, 1);
  assert.equal(new Set(clicks.map((r) => r.body.data.students[0].admissionNumber)).size, 1);
  assert.equal((await snapshot()).students, after.students + 1);
});

test("unauthenticated, recovery and malformed requests are refused without writes", async () => {
  const before = await snapshot();
  const buffer = await workbook([[`Unauthorized ${tag}`, nextPhone(), "", "", "", ""]]);
  assert.equal((await confirm(buffer, { cookie: null })).status, 401);
  assert.equal((await confirm(buffer, { cookie: "session=forged" })).status, 401);
  assert.equal((await confirm(buffer, { cookie: recoveryCookie })).status, 403);
  assert.equal((await confirm(buffer, { requestId: null })).status, 400);
  assert.equal((await confirm(buffer, { requestId: "not-a-uuid" })).status, 400);
  assert.equal((await confirm(Buffer.from("plain text"))).status, 400);
  assert.deepEqual(await snapshot(), before);
});

test("the downloaded official template round-trips through confirmation", async () => {
  const template = await fetch(`${baseUrl}/api/students/import/template`, { headers: { cookie: staffCookie } });
  assert.equal(template.status, 200);
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(Buffer.from(await template.arrayBuffer()));
  book.getWorksheet("Students").addRow([`Template Student ${tag}`, nextPhone(), "", "15-06-2003", `Python ${tag}`, "Palakkad"]);
  const result = await confirm(Buffer.from(await book.xlsx.writeBuffer()));
  assert.equal(result.status, 201, JSON.stringify(result.body));
  assert.deepEqual(result.body.data.students[0].courses, [`Python ${tag}`]);
});

async function register(student, cookie = staffCookie) {
  const response = await fetch(`${baseUrl}/api/students`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(student),
  });
  return { status: response.status, body: await response.json() };
}

async function admit(enquiryId, student, cookie = staffCookie) {
  const response = await fetch(`${baseUrl}/api/enquiries/${enquiryId}/admit`, {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(student),
  });
  return { status: response.status, body: await response.json() };
}

test("manual registration and enquiry admission share the duplicate rule", async () => {
  const phone = nextPhone();
  const first = await register({ firstName: `Manual Student ${tag}`, phone: `+91 ${phone}`, email: `manual-${tag}@example.invalid` });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const before = await snapshot();

  const again = await register({ firstName: `manual  student ${tag}`, phone });
  assert.equal(again.status, 409);
  assert.equal(again.body.data.admissionNumber, first.body.data.student.admissionNumber);

  const enquiry = await prisma.enquiry.create({ data: { requestId: randomUUID(), name: `Manual Student ${tag}`, phone, course: "Tally" } });
  const admitted = await admit(enquiry.id, { firstName: `Manual Student ${tag}`, phone: nextPhone(), email: `MANUAL-${tag}@example.invalid` });
  assert.equal(admitted.status, 409);
  assert.equal((await prisma.enquiry.findUnique({ where: { id: enquiry.id } })).studentId, null);
  assert.deepEqual(await snapshot(), before, "rejected registrations do not consume LIT numbers");

  // Siblings sharing the family phone are accepted by both methods.
  assert.equal((await register({ firstName: `Manual Sibling ${tag}`, phone })).status, 201);
  const sibling = await admit(enquiry.id, { firstName: `Enquiry Sibling ${tag}`, phone });
  assert.equal(sibling.status, 200, JSON.stringify(sibling.body));
  const after = await snapshot();
  assert.equal(after.counter, before.counter + 2, "LIT numbers stay consecutive");
});

test("concurrent registrations of one student across all methods create exactly one record", async () => {
  const phone = nextPhone();
  const name = `Cross Method ${tag}`;
  const enquiry = await prisma.enquiry.create({ data: { requestId: randomUUID(), name, phone, course: "Tally" } });
  const before = await snapshot();

  const results = await Promise.all([
    register({ firstName: name, phone }),
    register({ firstName: name, phone: `+91 ${phone}` }),
    admit(enquiry.id, { firstName: name, phone }),
    workbook([[name, phone, "", "", `Tally ${tag}`, ""]]).then((file) => confirm(file)),
  ]);

  const statuses = results.map((result) => result.status);
  assert.equal(statuses.filter((status) => status === 200 || status === 201).length, 1, JSON.stringify(statuses));
  assert.equal(statuses.filter((status) => status === 409).length, 3, JSON.stringify(statuses));
  const after = await snapshot();
  assert.equal(after.students, before.students + 1);
  assert.equal(after.counter, before.counter + 1);
  const { rowCount } = await db.query('SELECT 1 FROM students WHERE "firstName" = $1', [name]);
  assert.equal(rowCount, 1);
});

test("import endpoints are rate limited per signed-in user", async () => {
  const other = (await createSession("STAFF")).cookie;
  const relogin = await sessionFor(staffUser.id);
  const before = await snapshot();
  const file = Buffer.from("not a workbook");
  for (let attempt = 0; attempt < 10; attempt++) {
    assert.equal((await confirm(file)).status, 400);
  }
  const limited = await confirm(file);
  assert.equal(limited.status, 429);
  assert.match(limited.body.message, /Too many import confirmations/);

  // A new session for the same user does not reset the budget...
  const reloginResponse = await fetch(`${baseUrl}/api/students/import/confirm`, { method: "POST", headers: { cookie: relogin } });
  assert.equal(reloginResponse.status, 429);
  assert.ok(reloginResponse.headers.get("ratelimit"), "standard RateLimit header is sent");
  // ...but other users are unaffected, and unauthenticated calls are refused before counting.
  assert.equal((await confirm(file, { cookie: other })).status, 400);
  assert.equal((await confirm(file, { cookie: null })).status, 401);

  const preview = async () => (await fetch(`${baseUrl}/api/students/import/preview`, { method: "POST", headers: { cookie: other } })).status;
  for (let attempt = 0; attempt < 30; attempt++) assert.equal(await preview(), 400);
  assert.equal(await preview(), 429);
  assert.deepEqual(await snapshot(), before);
});
