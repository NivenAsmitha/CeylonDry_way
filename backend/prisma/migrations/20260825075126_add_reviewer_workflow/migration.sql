-- CreateEnum
CREATE TYPE "ReviewDecisionType" AS ENUM ('APPROVE', 'REQUEST_CHANGES', 'REJECT', 'SUSPEND', 'REACTIVATE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('PROPERTY_APPROVED', 'PROPERTY_CHANGES_REQUESTED', 'PROPERTY_REJECTED', 'PROPERTY_SUSPENDED', 'PROPERTY_REACTIVATED');

-- CreateTable
CREATE TABLE "ReviewDecision" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "propertyVersionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "ReviewDecisionType" NOT NULL,
    "reason" VARCHAR(1000),
    "fieldNotes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" VARCHAR(64) NOT NULL,
    "targetType" VARCHAR(64) NOT NULL,
    "targetId" TEXT NOT NULL,
    "beforeSummary" JSONB,
    "afterSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewDecision_propertyId_createdAt_idx" ON "ReviewDecision"("propertyId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewDecision_propertyVersionId_createdAt_idx" ON "ReviewDecision"("propertyVersionId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewDecision_reviewerId_createdAt_idx" ON "ReviewDecision"("reviewerId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewDecision_decision_idx" ON "ReviewDecision"("decision");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_createdAt_idx" ON "AuditLog"("targetType", "targetId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_createdAt_idx" ON "Notification"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Property_lifecycleStatus_updatedAt_id_idx" ON "Property"("lifecycleStatus", "updatedAt", "id");

-- CreateIndex
CREATE INDEX "PropertyVersion_submittedAt_id_idx" ON "PropertyVersion"("submittedAt", "id");

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_propertyVersionId_fkey" FOREIGN KEY ("propertyVersionId") REFERENCES "PropertyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewDecision" ADD CONSTRAINT "ReviewDecision_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
