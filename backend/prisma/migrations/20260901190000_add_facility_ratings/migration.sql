-- CreateTable
CREATE TABLE "FacilityRating" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cleanliness" INTEGER NOT NULL,
    "safety" INTEGER NOT NULL,
    "accessibility" INTEGER NOT NULL,
    "accuracy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilityRating_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FacilityRating_cleanliness_check" CHECK ("cleanliness" BETWEEN 1 AND 5),
    CONSTRAINT "FacilityRating_safety_check" CHECK ("safety" BETWEEN 1 AND 5),
    CONSTRAINT "FacilityRating_accessibility_check" CHECK ("accessibility" BETWEEN 1 AND 5),
    CONSTRAINT "FacilityRating_accuracy_check" CHECK ("accuracy" BETWEEN 1 AND 5)
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilityRating_propertyId_userId_key" ON "FacilityRating"("propertyId", "userId");

-- CreateIndex
CREATE INDEX "FacilityRating_propertyId_updatedAt_idx" ON "FacilityRating"("propertyId", "updatedAt");

-- CreateIndex
CREATE INDEX "FacilityRating_userId_updatedAt_idx" ON "FacilityRating"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "FacilityRating" ADD CONSTRAINT "FacilityRating_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilityRating" ADD CONSTRAINT "FacilityRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
