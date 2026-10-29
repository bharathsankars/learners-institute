import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

afterEach(() => vi.unstubAllGlobals());

import {
  getCurrentUserRequest,
  loginRequest,
} from "../src/api/auth.ts";

const user = {
  id: "1",
  firstName: "Test",
  lastName: "Admin",
  username: "testadmin",
  email: "test@example.com",
  role: "SUPER_ADMIN",
};

test("login returns the authenticated user", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({
      success: true,
      message: "Login successful.",
      data: { user },
    }),
  );

  const result = await loginRequest("testadmin", "password");

  assert.deepEqual(result, user);
});

test("login rejects invalid credentials", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json(
      { success: false, message: "Invalid username or password." },
      { status: 401 },
    ),
  );

  await assert.rejects(
    loginRequest("testadmin", "wrong"),
    /Invalid username or password/,
  );
});

test("login rejects a non-JSON server error", async () => {
  vi.stubGlobal("fetch", async () =>
    new Response("<html>Server error</html>", {
      status: 500,
      headers: { "Content-Type": "text/html" },
    }),
  );

  await assert.rejects(
    loginRequest("testadmin", "password"),
    /Unable to sign in/,
  );
});

test("login rejects a successful HTTP status with invalid data", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ success: true }, { status: 200 }),
  );

  await assert.rejects(
    loginRequest("testadmin", "password"),
    /Invalid login response/,
  );
});

test("session restoration returns null for expired session", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json(
      { success: false, message: "Please sign in again." },
      { status: 401 },
    ),
  );

  assert.equal(await getCurrentUserRequest(), null);
});

test("session restoration returns a valid user", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ success: true, data: { user } }),
  );

  assert.deepEqual(await getCurrentUserRequest(), user);
});

test("session restoration rejects server errors", async () => {
  vi.stubGlobal("fetch", async () =>
    new Response("Server unavailable", { status: 503 }),
  );

  await assert.rejects(
    getCurrentUserRequest(),
    /Unable to restore session/,
  );
});

test("session restoration rejects an invalid success response", async () => {
  vi.stubGlobal("fetch", async () =>
    Response.json({ success: true }, { status: 200 }),
  );

  await assert.rejects(
    getCurrentUserRequest(),
    /Invalid session response/,
  );
});
