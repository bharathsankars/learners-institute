ALTER TABLE "enquiries" ADD COLUMN "studentId" UUID;
CREATE INDEX "enquiries_studentId_idx" ON "enquiries"("studentId");
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
