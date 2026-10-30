import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

const url = new URL(connectionString);

// Never accidentally run live tests against production.
if (
  !["localhost", "127.0.0.1"].includes(url.hostname) ||
  url.port !== "5433" ||
  url.pathname !== "/learners_institute"
) {
  throw new Error(
    "Live tests are restricted to local learners_institute on port 5433.",
  );
}

async function connect() {
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

test("LIT admission numbering: rollback, inserts and immutability", async () => {
  const db = await connect();
  let inTransaction = false;

  try {
    const before = await db.query(
      'SELECT "lastNumber" FROM student_admission_counter WHERE id = 1',
    );
    const initial = Number(before.rows[0].lastNumber);

    const studentsBefore = await db.query(
      "SELECT COUNT(*)::int AS count FROM students",
    );

    await db.query("BEGIN");
    inTransaction = true;

    const inserted = await db.query(
      `INSERT INTO students (id, "firstName", phone, "updatedAt")
       VALUES ($1, $2, $3, NOW())
       RETURNING "id", "admissionNumber"`,
      [randomUUID(), "Temporary Test Student", "9999999999"],
    );

    const expected = `LIT${String(initial + 1).padStart(3, "0")}`;

    assert.equal(inserted.rows[0].admissionNumber, expected);

    const next = await db.query(
      "SELECT next_lit_admission_number() AS number",
    );

    assert.equal(
      next.rows[0].number,
      `LIT${String(initial + 2).padStart(3, "0")}`,
    );

    // Attempt to change an admission number; catch the expected error
    // inside a savepoint so the outer transaction remains usable.
    await db.query("SAVEPOINT immutable_test");

    try {
      await db.query(
        'UPDATE students SET "admissionNumber" = $1 WHERE id = $2',
        ["LIT999999", inserted.rows[0].id],
      );

      assert.fail("Admission number modification was unexpectedly allowed.");
    } catch (error) {
      assert.match(
        String(error.message),
        /admission numbers cannot be changed/i,
      );
    } finally {
      await db.query("ROLLBACK TO SAVEPOINT immutable_test");
    }

    await db.query("ROLLBACK");
    inTransaction = false;

    const after = await db.query(
      'SELECT "lastNumber" FROM student_admission_counter WHERE id = 1',
    );
    assert.equal(Number(after.rows[0].lastNumber), initial);

    const studentsAfter = await db.query(
      "SELECT COUNT(*)::int AS count FROM students",
    );

    assert.equal(
      studentsAfter.rows[0].count,
      studentsBefore.rows[0].count,
    );

    console.log(
      "PASS: automatic numbering, consecutive allocation, immutability, rollback and record preservation",
    );
  } finally {
    if (inTransaction) {
      await db.query("ROLLBACK");
    }
    await db.end();
  }
});

test("concurrent transactions serialize admission-number allocation", async () => {
  const first = await connect();
  const second = await connect();

  let firstOpen = false;
  let secondOpen = false;

  try {
    await first.query("BEGIN");
    firstOpen = true;

    await second.query("BEGIN");
    secondOpen = true;

    await second.query("SET LOCAL lock_timeout = '10s'");

    const a = await first.query(
      "SELECT next_lit_admission_number() AS number",
    );

    const pending = second.query(
      "SELECT next_lit_admission_number() AS number",
    );

    // Rollback releases the row lock and the first allocation.
    await first.query("ROLLBACK");
    firstOpen = false;

    const b = await pending;

    assert.equal(
      b.rows[0].number,
      a.rows[0].number,
      "Rolled-back allocation should be available again.",
    );

    await second.query("ROLLBACK");
    secondOpen = false;

    console.log("PASS: concurrent allocation and rollback");
  } finally {
    if (firstOpen) await first.query("ROLLBACK");
    if (secondOpen) await second.query("ROLLBACK");
    await first.end();
    await second.end();
  }
});
