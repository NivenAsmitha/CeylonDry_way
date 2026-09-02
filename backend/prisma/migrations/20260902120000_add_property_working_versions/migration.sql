ALTER TYPE "PropertyStatus" ADD VALUE 'UPDATE_CHANGES_REQUESTED';

ALTER TABLE "Property" ADD COLUMN "workingVersionId" TEXT;

UPDATE "Property"
SET "workingVersionId" = "activeVersionId"
WHERE "activeVersionId" IS NOT NULL;

CREATE UNIQUE INDEX "Property_workingVersionId_key"
ON "Property"("workingVersionId");

ALTER TABLE "Property"
ADD CONSTRAINT "Property_workingVersionId_fkey"
FOREIGN KEY ("workingVersionId") REFERENCES "PropertyVersion"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
