/*
  Warnings:

  - You are about to drop the column `address` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `estimatedCost` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `number` on the `jobs` table. All the data in the column will be lost.
  - Added the required column `homeAddress` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ownerName` to the `jobs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `jobs` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "jobs_number_key";

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "address",
DROP COLUMN "estimatedCost",
DROP COLUMN "number",
ADD COLUMN     "homeAddress" TEXT NOT NULL,
ADD COLUMN     "ownerName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "scheduledStart" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "estimates" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_id_counters" (
    "monthKey" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "job_id_counters_pkey" PRIMARY KEY ("monthKey")
);

-- CreateIndex
CREATE INDEX "estimates_jobId_createdAt_idx" ON "estimates"("jobId", "createdAt");

-- AddForeignKey
ALTER TABLE "estimates" ADD CONSTRAINT "estimates_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
