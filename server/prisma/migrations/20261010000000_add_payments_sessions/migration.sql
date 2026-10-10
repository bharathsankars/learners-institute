CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CARD');
CREATE TABLE "sessions" (
 "tokenHash" TEXT PRIMARY KEY,
 "userId" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE TABLE "payments" (
 "id" UUID PRIMARY KEY,
 "requestId" UUID NOT NULL UNIQUE,
 "receiptNumber" SERIAL NOT NULL UNIQUE,
 "feePlanId" UUID NOT NULL REFERENCES "fee_plans"("id") ON DELETE RESTRICT,
 "amountPaise" INTEGER NOT NULL CHECK ("amountPaise" > 0),
 "method" "PaymentMethod" NOT NULL,
 "paidAt" DATE NOT NULL,
 "reference" TEXT,
 "notes" TEXT,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "payments_feePlanId_idx" ON "payments"("feePlanId");
