import { inflateRawSync } from "node:zlib";

/*
 * Inspects an .xlsx (ZIP) archive before ExcelJS sees it.
 *
 * ExcelJS inflates every entry fully in memory, so declared sizes
 * cannot be trusted. Each entry is inflated here with a hard output
 * cap, which bounds the real decompressed size regardless of headers.
 */

const MAX_ENTRIES = 100;
const MAX_ENTRY_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const MAX_WORKSHEETS = 10;
const MAX_ROWS_PER_WORKSHEET = 5000;
const MAX_CELLS_PER_WORKSHEET = 50000;

const EOCD_SIGNATURE = 0x06054b50;
const CENTRAL_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;

// Parts ExcelJS never needs; their presence indicates an unexpected workbook.
const FORBIDDEN_ENTRY = /(^|\/)(vbaProject\.bin|externalLinks\/|embeddings\/|activeX\/)/i;
const WORKSHEET_ENTRY = /^xl\/worksheets\/[^/]+\.xml$/i;
const ROW_TAG = /<(?:\w+:)?row[\s>/]/g;
const CELL_TAG = /<(?:\w+:)?c[\s>/]/g;

export class XlsxArchiveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "XlsxArchiveError";
  }
}

function fail(message = "The Excel file structure is not supported."): never {
  throw new XlsxArchiveError(message);
}

function countMatches(text: string, pattern: RegExp, limit: number): number {
  let count = 0;
  pattern.lastIndex = 0;

  while (pattern.exec(text)) {
    if (++count > limit) break;
  }

  return count;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  // The record is 22 bytes plus a comment of at most 65535 bytes.
  const earliest = Math.max(0, buffer.length - 22 - 0xffff);

  for (let offset = buffer.length - 22; offset >= earliest; offset--) {
    if (buffer.readUInt32LE(offset) === EOCD_SIGNATURE) return offset;
  }

  return fail();
}

export function assertSafeXlsxArchive(buffer: Buffer): void {
  if (buffer.length < 22) fail();

  const eocd = findEndOfCentralDirectory(buffer);
  const diskNumber = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocd + 8);
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const commentLength = buffer.readUInt16LE(eocd + 20);

  if (
    diskNumber !== 0 ||
    centralDisk !== 0 ||
    entriesOnDisk !== totalEntries ||
    totalEntries === 0xffff ||
    centralOffset === 0xffffffff ||
    eocd + 22 + commentLength !== buffer.length ||
    centralOffset + centralSize !== eocd
  ) {
    fail();
  }

  if (totalEntries === 0 || totalEntries > MAX_ENTRIES) {
    fail("The Excel file contains too many internal parts.");
  }

  const names = new Set<string>();
  let totalBytes = 0;
  let worksheets = 0;
  let cursor = centralOffset;

  for (let index = 0; index < totalEntries; index++) {
    if (cursor + 46 > eocd || buffer.readUInt32LE(cursor) !== CENTRAL_SIGNATURE) {
      fail();
    }

    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const declaredSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const entryCommentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + nameLength)
      .toString("utf8");

    cursor += 46 + nameLength + extraLength + entryCommentLength;

    if (cursor > eocd) fail();

    if (flags & 0x1) fail("Password-protected Excel files are not supported.");

    if (
      (method !== 0 && method !== 8) ||
      compressedSize === 0xffffffff ||
      declaredSize === 0xffffffff ||
      localOffset === 0xffffffff
    ) {
      fail();
    }

    const normalizedName = name.replace(/^\/+/, "");

    if (
      !normalizedName ||
      normalizedName.includes("\\") ||
      normalizedName.split("/").includes("..") ||
      names.has(normalizedName.toLowerCase())
    ) {
      fail();
    }

    names.add(normalizedName.toLowerCase());

    if (FORBIDDEN_ENTRY.test(normalizedName)) {
      fail("Excel files with macros, external links or embedded objects are not supported.");
    }

    if (normalizedName.endsWith("/")) {
      if (compressedSize !== 0 || declaredSize !== 0) fail();
      continue;
    }

    if (declaredSize > MAX_ENTRY_BYTES || totalBytes + declaredSize > MAX_TOTAL_BYTES) {
      fail("The Excel file expands beyond the permitted size.");
    }

    if (
      localOffset + 30 > centralOffset ||
      buffer.readUInt32LE(localOffset) !== LOCAL_SIGNATURE
    ) {
      fail();
    }

    const dataStart =
      localOffset +
      30 +
      buffer.readUInt16LE(localOffset + 26) +
      buffer.readUInt16LE(localOffset + 28);
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > centralOffset) fail();

    const compressed = buffer.subarray(dataStart, dataEnd);
    let content: Buffer;

    if (method === 0) {
      content = compressed;
    } else {
      try {
        // Inflating one byte past the cap proves whether the real size exceeds it.
        content = inflateRawSync(compressed, {
          maxOutputLength: Math.min(MAX_ENTRY_BYTES, MAX_TOTAL_BYTES - totalBytes) + 1,
        });
      } catch {
        fail("The Excel file expands beyond the permitted size or is corrupted.");
      }
    }

    // Headers that misstate the real size indicate a crafted archive.
    if (content.length !== declaredSize) fail();

    totalBytes += content.length;

    if (!/\.(xml|rels|vml)$/i.test(normalizedName)) continue;

    const text = content.toString("utf8");

    // ExcelJS does not need DTDs; rejecting them rules out entity expansion.
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) {
      fail();
    }

    if (WORKSHEET_ENTRY.test(normalizedName)) {
      if (++worksheets > MAX_WORKSHEETS) {
        fail("The Excel file contains too many worksheets.");
      }

      if (
        countMatches(text, ROW_TAG, MAX_ROWS_PER_WORKSHEET) > MAX_ROWS_PER_WORKSHEET ||
        countMatches(text, CELL_TAG, MAX_CELLS_PER_WORKSHEET) > MAX_CELLS_PER_WORKSHEET
      ) {
        fail("A worksheet in the Excel file is too large.");
      }
    }
  }

  if (cursor !== eocd) fail();
}
