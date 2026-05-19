-- CreateTable
CREATE TABLE "items" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "cost" DECIMAL(10,2) NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_id_counters" (
    "companyId" TEXT NOT NULL,
    "lastSeq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "item_id_counters_pkey" PRIMARY KEY ("companyId")
);

-- CreateIndex
CREATE INDEX "items_companyId_idx" ON "items"("companyId");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
