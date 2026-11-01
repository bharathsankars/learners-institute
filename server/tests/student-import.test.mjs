import test from "node:test";
import assert from "node:assert/strict";
import { crc32, deflateRawSync } from "node:zlib";
import ExcelJS from "exceljs";
import { app } from "../dist/src/app.js";
import { prisma } from "../dist/src/config/database.js";
import { assertSafeXlsxArchive } from "../dist/src/utils/xlsx-archive-guard.js";
import { readStudentWorkbook } from "../dist/src/services/student-import-preview.service.js";

const HEADERS = ["Student Name", "Phone", "Email", "DOB (DD-MM-YYYY)", "Courses Enrolled", "Address"];

// Minimal ZIP writer so tests can forge archives ExcelJS would never produce.
function zip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data, method = 8, declaredSize, flags = 0 } of entries) {
    const nameBytes = Buffer.from(name);
    const body = method === 8 ? deflateRawSync(data) : data;
    const size = declaredSize ?? data.length;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(method, 8); local.writeUInt32LE(crc32(data), 14);
    local.writeUInt32LE(body.length, 18); local.writeUInt32LE(size, 22); local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags, 8); central.writeUInt16LE(method, 10); central.writeUInt32LE(crc32(data), 16);
    central.writeUInt32LE(body.length, 20); central.writeUInt32LE(size, 24); central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, body);
    centrals.push(central, nameBytes);
    offset += 30 + nameBytes.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

const xml = (text) => Buffer.from(`<?xml version="1.0"?>${text}`);

async function workbookBuffer(rows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");
  sheet.addRow(HEADERS);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test("a genuine ExcelJS workbook passes the archive guard", async () => {
  const buffer = await workbookBuffer([["Guard Student", "9876543210", "", "21-08-2005", "", ""]]);
  assert.doesNotThrow(() => assertSafeXlsxArchive(buffer));
  const workbook = await readStudentWorkbook(buffer);
  assert.equal(workbook.rows.length, 1);
  assert.match(workbook.fileSha256, /^[0-9a-f]{64}$/);
});

test("a small upload that inflates past the limit is rejected before ExcelJS parses it", async () => {
  // ~30 MB of zeros compresses to roughly 30 KB.
  const bomb = zip([{ name: "xl/sharedStrings.xml", data: Buffer.alloc(30 * 1024 * 1024) }]);
  assert.ok(bomb.length < 100 * 1024);
  assert.throws(() => assertSafeXlsxArchive(bomb), /expands beyond the permitted size/);
  await assert.rejects(readStudentWorkbook(bomb), { name: "StudentImportValidationError" });
});

test("entry headers that understate the real size are rejected", () => {
  const lying = zip([{ name: "xl/styles.xml", data: Buffer.alloc(6 * 1024 * 1024), declaredSize: 1000 }]);
  assert.throws(() => assertSafeXlsxArchive(lying), /expands beyond|not supported/);
  const mismatched = zip([{ name: "xl/styles.xml", data: Buffer.alloc(5000), declaredSize: 4000 }]);
  assert.throws(() => assertSafeXlsxArchive(mismatched), /not supported/);
});

test("many small parts that together exceed the total limit are rejected", () => {
  const parts = Array.from({ length: 5 }, (_, index) => ({ name: `xl/media/image${index}.png`, data: Buffer.alloc(4.5 * 1024 * 1024) }));
  assert.throws(() => assertSafeXlsxArchive(zip(parts)), /expands beyond the permitted size/);
});

test("excessive workbook complexity is rejected without relying on ExcelJS row counts", () => {
  const rows = "<row/>".repeat(5001);
  assert.throws(() => assertSafeXlsxArchive(zip([{ name: "xl/worksheets/sheet1.xml", data: xml(`<worksheet><sheetData>${rows}</sheetData></worksheet>`) }])), /worksheet .* too large/i);
  const cells = `<row>${"<c/>".repeat(50001)}</row>`;
  assert.throws(() => assertSafeXlsxArchive(zip([{ name: "xl/worksheets/sheet1.xml", data: xml(`<worksheet><sheetData>${cells}</sheetData></worksheet>`) }])), /too large/);
  const sheets = Array.from({ length: 11 }, (_, index) => ({ name: `xl/worksheets/sheet${index}.xml`, data: xml("<worksheet/>") }));
  assert.throws(() => assertSafeXlsxArchive(zip(sheets)), /too many worksheets/);
  const parts = Array.from({ length: 101 }, (_, index) => ({ name: `docProps/part${index}.xml`, data: xml("<a/>") }));
  assert.throws(() => assertSafeXlsxArchive(zip(parts)), /too many internal parts/);
});

test("DTDs, macros, encryption, traversal and unsupported compression are rejected", () => {
  const cases = [
    [{ name: "xl/workbook.xml", data: xml('<!DOCTYPE x [<!ENTITY a "aaaa">]><x>&a;</x>') }, /not supported/],
    [{ name: "xl/vbaProject.bin", data: Buffer.from("macro") }, /macros/],
    [{ name: "xl/externalLinks/externalLink1.xml", data: xml("<x/>") }, /external links/],
    [{ name: "xl/workbook.xml", data: xml("<x/>"), flags: 1 }, /Password-protected/],
    [{ name: "../evil.xml", data: xml("<x/>") }, /not supported/],
    [{ name: "xl/workbook.xml", data: xml("<x/>"), method: 12 }, /not supported/],
  ];
  for (const [entry, message] of cases) {
    assert.throws(() => assertSafeXlsxArchive(zip([entry])), message, entry.name);
  }
  const duplicate = zip([{ name: "xl/a.xml", data: xml("<x/>") }, { name: "XL/A.xml", data: xml("<y/>") }]);
  assert.throws(() => assertSafeXlsxArchive(duplicate), /not supported/);
});

test("truncated, padded and non-ZIP uploads are rejected", async () => {
  const valid = await workbookBuffer([["Guard Student", "9876543210", "", "", "", ""]]);
  assert.throws(() => assertSafeXlsxArchive(valid.subarray(0, valid.length - 10)), /not supported/);
  assert.throws(() => assertSafeXlsxArchive(Buffer.concat([valid, Buffer.from("trailing")])), /not supported/);
  await assert.rejects(readStudentWorkbook(Buffer.from("PK\u0003\u0004 but not a zip at all")), { name: "StudentImportValidationError" });
});

test("oversized cell text is rejected", async () => {
  const buffer = await workbookBuffer([["Long Address", "9876543210", "", "", "", "x".repeat(1001)]]);
  await assert.rejects(readStudentWorkbook(buffer), /exceeds 1000 characters/);
});

// Exercise Express routing without a network listener or database writes.
function request(method, path, cookie) {
  return new Promise((resolve, reject) => {
    const req = { method, url: path, originalUrl: path, headers: cookie ? { cookie } : {}, body: {}, socket: {}, on() {}, unpipe() {} };
    const res = { headers: {}, statusCode: 200, setHeader(name, value) { this.headers[name] = value; }, getHeader(name) { return this.headers[name]; }, removeHeader(name) { delete this.headers[name]; }, end(text) { resolve({ status: this.statusCode, body: text ? JSON.parse(text) : null }); } };
    app.handle(req, res, reject);
  });
}

async function withSession(session, run) {
  const originals = { findUnique: prisma.session.findUnique, transaction: prisma.$transaction };
  let transactions = 0;
  prisma.session.findUnique = async () => session;
  prisma.$transaction = async () => { transactions++; throw new Error("No transaction expected."); };
  try { await run(); } finally {
    prisma.session.findUnique = originals.findUnique;
    prisma.$transaction = originals.transaction;
  }
  assert.equal(transactions, 0, "unauthorized request reached the database transaction");
}

test("import confirmation requires an authenticated administration session", async () => {
  await withSession(null, async () => {
    for (const cookie of [undefined, "session=unknown"]) {
      const response = await request("POST", "/api/students/import/confirm", cookie);
      assert.equal(response.status, 401);
    }
  });
  await withSession({ expiresAt: new Date(Date.now() - 1000), user: { isActive: true, role: "ADMIN" } }, async () => {
    assert.equal((await request("POST", "/api/students/import/confirm", "session=expired")).status, 401);
  });
  await withSession({ expiresAt: new Date(Date.now() + 60000), user: { isActive: false, role: "ADMIN" } }, async () => {
    assert.equal((await request("POST", "/api/students/import/confirm", "session=disabled")).status, 401);
  });
  await withSession({ expiresAt: new Date(Date.now() + 60000), user: { isActive: true, role: "RECOVERY_ADMIN" } }, async () => {
    const response = await request("POST", "/api/students/import/confirm", "session=recovery");
    assert.equal(response.status, 403);
  });
});

test("the shared duplicate rule matches name with phone or email, never contact details alone", async () => {
  const { duplicateKeys } = await import("../dist/src/services/student-duplicate.service.js");
  const same = (a, b) => duplicateKeys(a).some((key) => duplicateKeys(b).includes(key));
  const anu = { firstName: "Anu", lastName: "Krishnan", phone: "+91 94461 25964", email: "Family@Example.invalid" };
  assert.ok(same(anu, { firstName: "  anu   krishnan ", phone: "9446125964" }), "name + reformatted phone");
  assert.ok(same(anu, { firstName: "Anu Krishnan", phone: "9000000000", email: "family@example.invalid" }), "name + email");
  assert.ok(!same(anu, { firstName: "Arun Krishnan", phone: "9446125964", email: "family@example.invalid" }), "sibling with family phone and email");
  assert.ok(!same(anu, { firstName: "Anu Krishnan", phone: "9000000000" }), "same name, different contact");
});
