import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../dist/src/config/database.js";
import { createFeePlan } from "../dist/src/services/fee.service.js";
import { createFeePlanController } from "../dist/src/controllers/fee.controller.js";

const studentId = "e9a09b93-1bc2-4e99-9590-04aeb8e97981";
const courseId = "be58c3eb-8056-4ec9-8d02-d9befc762939";

const input = {
  studentId,
  courseId,
  totalFeePaise: 100000,
  discountPaise: 0,
};

function response() {
  return {
    statusCode: 200,
    status(value) {
      this.statusCode = value;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

async function withMockTransaction(callback) {
  const original = prisma.$transaction;

  const calls = {
    enrollmentCreated: 0,
    feePlanCreated: 0,
  };

  const transaction = {
    enrollment: {
      findFirst: async () => null,
      create: async () => {
        calls.enrollmentCreated++;
        return { id: "new-enrollment" };
      },
    },
    feePlan: {
      create: async ({ data }) => {
        calls.feePlanCreated++;
        return {
          id: "new-fee-plan",
          enrollmentId: data.enrollmentId,
        };
      },
    },
  };

  try {
    prisma.$transaction = async fn => fn(transaction);
    await callback(transaction, calls);
  } finally {
    prisma.$transaction = original;
  }
}

test("reuses an existing active enrollment when creating fees", async () => {
  await withMockTransaction(async (transaction, calls) => {
    transaction.enrollment.findFirst = async options => {
      assert.deepEqual(options.where, {
        studentId,
        courseId,
        status: "ACTIVE",
      });

      return { id: "existing-enrollment" };
    };

    const result = await createFeePlan(input);

    assert.equal(result.enrollmentId, "existing-enrollment");
    assert.equal(calls.enrollmentCreated, 0);
    assert.equal(calls.feePlanCreated, 1);
  });
});

test("creates a new enrollment when none exists", async () => {
  await withMockTransaction(async (_transaction, calls) => {
    const result = await createFeePlan(input);

    assert.equal(result.enrollmentId, "new-enrollment");
    assert.equal(calls.enrollmentCreated, 1);
    assert.equal(calls.feePlanCreated, 1);
  });
});

test("a failed fee-plan creation does not claim success", async () => {
  await withMockTransaction(async transaction => {
    transaction.enrollment.findFirst = async () => ({
      id: "existing-enrollment",
    });

    transaction.feePlan.create = async () => {
      throw { code: "P2002" };
    };

    const res = response();

    await createFeePlanController(
      { body: input },
      res,
    );

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
  });
});

test("a concurrent active-enrollment conflict returns HTTP 409", async () => {
  await withMockTransaction(async transaction => {
    transaction.enrollment.create = async () => {
      throw { code: "P2002" };
    };

    const res = response();

    await createFeePlanController(
      { body: input },
      res,
    );

    assert.equal(res.statusCode, 409);
    assert.equal(res.body.success, false);
  });
});
