-- CreateTable
CREATE TABLE "super_admin_recovery_codes" (
    "id" UUID NOT NULL,
    "superAdminId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "super_admin_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "super_admin_recovery_codes_superAdminId_expiresAt_idx" ON "super_admin_recovery_codes"("superAdminId", "expiresAt");

-- CreateIndex
CREATE INDEX "super_admin_recovery_codes_createdById_idx" ON "super_admin_recovery_codes"("createdById");
