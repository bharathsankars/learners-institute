import assert from "node:assert/strict";
import { afterEach, test, vi } from "vitest";

import { parseApiError } from "../src/api/errors";
import {
  subscribeToAdminSessionExpiry,
  notifyAdminSessionExpired,
  getAdminSessionGeneration,
  advanceAdminSessionGeneration,
} from "../src/admin/auth/sessionEvents";

afterEach(() => {
  vi.unstubAllGlobals();
});

function setupListener() {
  vi.stubGlobal("window", new EventTarget());

  let notificationCount = 0;

  const unsubscribe = subscribeToAdminSessionExpiry(() => {
    notificationCount += 1;
  });

  return {
    count: () => notificationCount,
    unsubscribe,
  };
}

test("protected HTTP 401 notifies session expiration", async () => {
  const listener = setupListener();

  const requestGeneration = getAdminSessionGeneration();

  const error = await parseApiError(
    Response.json(
      { success: false, message: "Please sign in again." },
      { status: 401 },
    ),
    true,
    requestGeneration,
  );

  assert.equal(error.message, "Please sign in again.");
  assert.equal(listener.count(), 1);
});

test("public HTTP 401 does not notify session expiration", async () => {
  const listener = setupListener();

  await parseApiError(
    Response.json({ message: "Unauthorized" }, { status: 401 }),
  );

  assert.equal(listener.count(), 0);
});

test("protected HTTP 403 does not notify session expiration", async () => {
  const listener = setupListener();

  await parseApiError(
    Response.json({ message: "Forbidden" }, { status: 403 }),
    true,
  );

  assert.equal(listener.count(), 0);
});

test("protected HTTP 500 does not notify session expiration", async () => {
  const listener = setupListener();

  await parseApiError(
    new Response("Server error", { status: 500 }),
    true,
  );

  assert.equal(listener.count(), 0);
});

test("unsubscribed listeners receive no further notifications", () => {
  const listener = setupListener();

  notifyAdminSessionExpired();
  assert.equal(listener.count(), 1);

  listener.unsubscribe();

  notifyAdminSessionExpired();
  assert.equal(listener.count(), 1);
});

test("an old request cannot expire a newer login session", () => {
  const listener = setupListener();

  const oldGeneration = getAdminSessionGeneration();

  advanceAdminSessionGeneration();

  notifyAdminSessionExpired(oldGeneration);

  assert.equal(listener.count(), 0);

  notifyAdminSessionExpired(getAdminSessionGeneration());

  assert.equal(listener.count(), 1);
});

test("a delayed 401 from an old API request does not expire a new session", async () => {
  const listener = setupListener();

  let resolveRequest!: (response: Response) => void;

  const pendingResponse = new Promise<Response>((resolve) => {
    resolveRequest = resolve;
  });

  vi.stubGlobal("fetch", vi.fn(() => pendingResponse));

  const oldGeneration = getAdminSessionGeneration();

  const request = (async () => {
    const requestGeneration = getAdminSessionGeneration();
    const response = await fetch("/api/admin-users");

    if (!response.ok) {
      throw await parseApiError(response, true, requestGeneration);
    }
  })();

  advanceAdminSessionGeneration();

  resolveRequest(
    Response.json(
      { success: false, message: "Please sign in again." },
      { status: 401 },
    ),
  );

  await assert.rejects(request, /Please sign in again/);

  assert.equal(getAdminSessionGeneration(), oldGeneration + 1);
  assert.equal(listener.count(), 0);
});
