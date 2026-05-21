-- DropIndex: remove the per-company unique constraint on email
DROP INDEX IF EXISTS "employees_companyId_email_key";

-- AlterTable: drop the old compound unique constraint
ALTER TABLE "employees" DROP CONSTRAINT IF EXISTS "employees_companyId_email_key";

-- CreateIndex: add globally unique constraint on email
CREATE UNIQUE INDEX "employees_email_key" ON "employees"("email");
