import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import ExcelJS from "exceljs";
import {
  previewStudentImport,
} from "../dist/src/services/student-import-preview.service.js";

const HEADERS = [
  "Student Name",
  "Phone",
  "Email",
  "DOB (DD-MM-YYYY)",
  "Courses Enrolled",
  "Address",
];

async function workbookBuffer(rows, headers = HEADERS) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");
  sheet.addRow(headers);

  for (const row of rows) {
    sheet.addRow(row);
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("valid full name and DD-MM-YYYY date convert correctly", async () => {
  const buffer = await workbookBuffer([
    ["Preview Test Student", "9876543210", "", "21-08-2005", "", "Palakkad"],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.totalRows, 1);
  assert.equal(result.validRows, 1);
  assert.equal(result.rows[0].data.firstName, "Preview Test Student");
  assert.equal(result.rows[0].data.lastName, "");
  assert.equal(result.rows[0].data.dateOfBirth, "2005-08-21");
});

test("multiple active course names resolve to UUIDs", async () => {
  const buffer = await workbookBuffer([
    [
      "Course Preview Student",
      "9876543211",
      "",
      "12-08-2000",
      "Computer Basics, Microsoft 365",
      "",
    ],
  ]);

  const result = await previewStudentImport(buffer);
  const row = result.rows[0];

  assert.equal(result.validRows, 1);
  assert.deepEqual(
    row.selectedCourses.map((course) => course.title),
    ["Computer Basics", "Microsoft 365"],
  );

  for (const course of row.selectedCourses) {
    assert.match(
      course.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  }
});

test("course matching ignores capitalization and surrounding spaces", async () => {
  const buffer = await workbookBuffer([
    ["Course Case Test", "9876543212", "", "", "  computer basics , MICROSOFT 365  ", ""],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.validRows, 1);
  assert.equal(result.rows[0].selectedCourses.length, 2);
});

test("unknown courses are rejected", async () => {
  const buffer = await workbookBuffer([
    ["Unknown Course Test", "9876543213", "", "", "Imaginary Training Course", ""],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.invalidRows, 1);
  assert.match(result.rows[0].errors.join(" "), /Unknown course/);
});

test("inactive courses are rejected", async () => {
  const buffer = await workbookBuffer([
    ["Inactive Course Test", "9876543214", "", "", "Demo course", ""],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.invalidRows, 1);
  assert.match(result.rows[0].errors.join(" "), /Inactive course/);
});

test("duplicate course selections are rejected", async () => {
  const buffer = await workbookBuffer([
    [
      "Duplicate Course Test",
      "9876543215",
      "",
      "",
      "Computer Basics, computer basics",
      "",
    ],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.invalidRows, 1);
  assert.match(result.rows[0].errors.join(" "), /Duplicate course selection/);
});

test("potential duplicate students produce warnings", async () => {
  const buffer = await workbookBuffer([
    ["Same  Student", "9876543216", "", "", "", ""],
    ["Same Student", "9876543216", "", "", "", ""],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.totalRows, 2);
  assert.equal(result.validRows, 2);
  assert.ok(result.rows[1].warnings.length > 0);
});

test("missing required student data is rejected", async () => {
  const buffer = await workbookBuffer([
    ["A", "123", "invalid-email", "", "", ""],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.invalidRows, 1);
  assert.ok(result.rows[0].errors.length >= 2);
});

test("invalid calendar dates are rejected", async () => {
  const buffer = await workbookBuffer([
    ["Invalid Date Test", "9876543217", "", "30-02-2005", "", ""],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.invalidRows, 1);
  assert.match(result.rows[0].errors.join(" "), /Invalid calendar date/);
});

test("old YYYY-MM-DD date format is rejected", async () => {
  const buffer = await workbookBuffer([
    ["Wrong Date Format", "9876543218", "", "2005-08-21", "", ""],
  ]);

  const result = await previewStudentImport(buffer);

  assert.equal(result.invalidRows, 1);
  assert.match(result.rows[0].errors.join(" "), /DD-MM-YYYY/);
});

test("old template headers are rejected", async () => {
  const buffer = await workbookBuffer(
    [["Example Student", "9876543219"]],
    ["First Name", ...HEADERS.slice(1)],
  );

  await assert.rejects(
    previewStudentImport(buffer),
    /Invalid template column/,
  );
});

test("empty spreadsheets are rejected", async () => {
  const buffer = await workbookBuffer([]);

  await assert.rejects(
    previewStudentImport(buffer),
    /contains no student records/,
  );
});

test("malformed Excel files are rejected", async () => {
  await assert.rejects(
    previewStudentImport(Buffer.from("not an Excel workbook")),
    /Invalid or oversized Excel file/,
  );
});

test("more than 500 student rows are rejected", async () => {
  const rows = Array.from({ length: 501 }, (_, index) => [
    `Student ${index}`,
    `98765${String(index).padStart(5, "0")}`,
    "",
    "",
    "",
    "",
  ]);

  const buffer = await workbookBuffer(rows);

  await assert.rejects(
    previewStudentImport(buffer),
    /Maximum 500 student rows/,
  );
});
