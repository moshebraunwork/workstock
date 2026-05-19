-- CreateTable
CREATE TABLE "jobs" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "estimatedCost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jobs_number_key" ON "jobs"("number");
