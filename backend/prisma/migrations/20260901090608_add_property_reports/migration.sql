-- CreateEnum
CREATE TYPE "PropertyReportCategory" AS ENUM ('INCORRECT_DETAILS', 'CLOSED_OR_MISSING', 'ACCESSIBILITY_ISSUE', 'SAFETY_OR_CLEANLINESS', 'DUPLICATE', 'INAPPROPRIATE_CONTENT', 'OTHER');

-- CreateEnum
CREATE TYPE "PropertyReportStatus" AS ENUM ('OPEN', 'IN_REVIEW', 'RESOLVED', 'DISMISSED');

-- CreateTable
CREATE TABLE "PropertyReport" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyVersionId" TEXT NOT NULL,
    "category" "PropertyReportCategory" NOT NULL,
    "description" VARCHAR(1500) NOT NULL,
    "reporterEmail" VARCHAR(254),
    "status" "PropertyReportStatus" NOT NULL DEFAULT 'OPEN',
    "moderatorId" TEXT,
    "moderatorNote" VARCHAR(1500),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyReport_status_createdAt_idx" ON "PropertyReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyReport_propertyId_createdAt_idx" ON "PropertyReport"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyReport_moderatorId_updatedAt_idx" ON "PropertyReport"("moderatorId", "updatedAt");

-- AddForeignKey
ALTER TABLE "PropertyReport" ADD CONSTRAINT "PropertyReport_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReport" ADD CONSTRAINT "PropertyReport_propertyVersionId_fkey" FOREIGN KEY ("propertyVersionId") REFERENCES "PropertyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReport" ADD CONSTRAINT "PropertyReport_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
