import type {
  PropertyStatus,
  PropertyType,
  PropertyVersion,
} from "../../properties/types/property.types";

export const REVIEW_DECISIONS = [
  "APPROVE",
  "REQUEST_CHANGES",
  "REJECT",
  "SUSPEND",
  "REACTIVATE",
] as const;

export type ReviewDecisionType = (typeof REVIEW_DECISIONS)[number];

export const REVIEWER_QUEUE_STATUSES = [
  "PENDING",
  "PENDING_UPDATE",
  "APPROVED",
  "CHANGES_REQUESTED",
  "UPDATE_CHANGES_REQUESTED",
  "REJECTED",
  "SUSPENDED",
] as const satisfies readonly PropertyStatus[];

export type ReviewerQueueStatus = (typeof REVIEWER_QUEUE_STATUSES)[number];

export interface ReviewFieldNote {
  field: string;
  message: string;
}

export interface ReviewerQueueItem {
  propertyId: string;
  propertyVersionId: string;
  version: number;
  name: string | null;
  propertyType: PropertyType | null;
  district: string | null;
  city: string | null;
  lifecycleStatus: PropertyStatus;
  submittedAt: string;
  owner: { name: string };
}

export interface ReviewerQueueResponse {
  items: ReviewerQueueItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ReviewDecisionHistory {
  id: string;
  decision: ReviewDecisionType;
  reason: string | null;
  fieldNotes: ReviewFieldNote[] | null;
  createdAt: string;
  reviewer: { name: string };
}

export interface ReviewerSubmittedVersion extends Omit<
  PropertyVersion,
  "submittedAt"
> {
  submittedAt: string;
}

export interface ReviewerListing {
  propertyId: string;
  lifecycleStatus: PropertyStatus;
  owner: { name: string };
  submittedVersion: ReviewerSubmittedVersion;
  allowedDecisions: ReviewDecisionType[];
  decisionHistory: ReviewDecisionHistory[];
}

export interface ReviewDecisionInput {
  decision: ReviewDecisionType;
  reason?: string | null;
  fieldNotes?: ReviewFieldNote[];
}

export interface ReviewerQueueQuery {
  page: number;
  pageSize: number;
  status: ReviewerQueueStatus;
}
