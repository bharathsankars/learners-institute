import assert from "node:assert/strict";
import test from "node:test";

import { parseApiError } from "../src/api/errors.ts";

test("returns the API error message", async () => {
  const response = new Response(
    JSON.stringify({ message: "Student not found." }),
    { status: 404 },
  );

  const error = await parseApiError(response);

  assert.equal(error.message, "Student not found.");
});

test("uses fallback when message is missing", async () => {
  const response = new Response(
    JSON.stringify({ success: false }),
    { status: 400 },
  );

  const error = await parseApiError(response);

  assert.equal(error.message, "Something went wrong.");
});

test("uses fallback for malformed JSON", async () => {
  const response = new Response("Invalid JSON", {
    status: 500,
  });

  const error = await parseApiError(response);

  assert.equal(error.message, "Something went wrong.");
});

test("uses fallback for an empty response", async () => {
  const response = new Response(null, {
    status: 500,
  });

  const error = await parseApiError(response);

  assert.equal(error.message, "Something went wrong.");
});
