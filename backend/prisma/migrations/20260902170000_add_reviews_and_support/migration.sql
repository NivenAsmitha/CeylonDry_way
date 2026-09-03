CREATE TYPE "ReviewModerationStatus" AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE "SupportTicketCategory" AS ENUM ('ACCOUNT_LOGIN', 'PROPERTY_LISTING', 'REVIEW_RATING', 'INCORRECT_FACILITY', 'PHOTO_UPLOAD', 'ACCESSIBILITY', 'SAFETY', 'TECHNICAL', 'OTHER');
CREATE TYPE "SupportTicketStatus" AS ENUM ('OPEN', 'ASSIGNED', 'WAITING_FOR_CLIENT', 'WAITING_FOR_STAFF', 'ESCALATED', 'RESOLVED', 'CLOSED');
CREATE TYPE "SupportTicketPriority" AS ENUM ('NORMAL', 'URGENT');

ALTER TYPE "NotificationType" ADD VALUE 'REVIEW_OWNER_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT_TICKET_REPLY';
ALTER TYPE "NotificationType" ADD VALUE 'SUPPORT_TICKET_ASSIGNED';

ALTER TABLE "FacilityRating"
ADD COLUMN "reviewText" VARCHAR(1000),
ADD COLUMN "visitDate" DATE,
ADD COLUMN "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'VISIBLE',
ADD COLUMN "moderationReason" VARCHAR(1000),
ADD COLUMN "moderatedById" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3);

CREATE TABLE "FacilityRatingReply" (
    "id" TEXT NOT NULL,
    "ratingId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "moderationStatus" "ReviewModerationStatus" NOT NULL DEFAULT 'VISIBLE',
    "moderationReason" VARCHAR(1000),
    "moderatedById" TEXT,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FacilityRatingReply_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "ticketNumber" SERIAL NOT NULL,
    "createdById" TEXT NOT NULL,
    "assignedReviewerId" TEXT,
    "relatedPropertyId" TEXT,
    "category" "SupportTicketCategory" NOT NULL,
    "priority" "SupportTicketPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "subject" VARCHAR(140) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "isStaffNote" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FacilityRatingReply_ratingId_key" ON "FacilityRatingReply"("ratingId");
CREATE INDEX "FacilityRatingReply_authorId_updatedAt_idx" ON "FacilityRatingReply"("authorId", "updatedAt");
CREATE INDEX "FacilityRatingReply_moderationStatus_updatedAt_idx" ON "FacilityRatingReply"("moderationStatus", "updatedAt");
CREATE INDEX "FacilityRatingReply_moderatedById_moderatedAt_idx" ON "FacilityRatingReply"("moderatedById", "moderatedAt");
CREATE INDEX "FacilityRating_moderationStatus_updatedAt_idx" ON "FacilityRating"("moderationStatus", "updatedAt");
CREATE INDEX "FacilityRating_moderatedById_moderatedAt_idx" ON "FacilityRating"("moderatedById", "moderatedAt");
CREATE UNIQUE INDEX "SupportTicket_ticketNumber_key" ON "SupportTicket"("ticketNumber");
CREATE INDEX "SupportTicket_createdById_updatedAt_idx" ON "SupportTicket"("createdById", "updatedAt");
CREATE INDEX "SupportTicket_assignedReviewerId_status_updatedAt_idx" ON "SupportTicket"("assignedReviewerId", "status", "updatedAt");
CREATE INDEX "SupportTicket_status_priority_createdAt_idx" ON "SupportTicket"("status", "priority", "createdAt");
CREATE INDEX "SupportTicket_relatedPropertyId_idx" ON "SupportTicket"("relatedPropertyId");
CREATE INDEX "SupportMessage_ticketId_createdAt_idx" ON "SupportMessage"("ticketId", "createdAt");
CREATE INDEX "SupportMessage_authorId_createdAt_idx" ON "SupportMessage"("authorId", "createdAt");

ALTER TABLE "FacilityRating" ADD CONSTRAINT "FacilityRating_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FacilityRatingReply" ADD CONSTRAINT "FacilityRatingReply_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "FacilityRating"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FacilityRatingReply" ADD CONSTRAINT "FacilityRatingReply_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FacilityRatingReply" ADD CONSTRAINT "FacilityRatingReply_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_assignedReviewerId_fkey" FOREIGN KEY ("assignedReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_relatedPropertyId_fkey" FOREIGN KEY ("relatedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
