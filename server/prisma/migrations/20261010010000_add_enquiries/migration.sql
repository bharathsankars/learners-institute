CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');
CREATE TABLE "enquiries" (
  "id" UUID PRIMARY KEY,
  "requestId" UUID NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "course" TEXT NOT NULL,
  "message" TEXT,
  "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "enquiries_status_idx" ON "enquiries"("status");
CREATE INDEX "enquiries_createdAt_idx" ON "enquiries"("createdAt");
