import {
  PropertyStatus,
  ReviewDecisionType,
} from '../../generated/prisma/client.js';

const transitions: Readonly<
  Partial<
    Record<PropertyStatus, Partial<Record<ReviewDecisionType, PropertyStatus>>>
  >
> = {
  [PropertyStatus.PENDING]: {
    [ReviewDecisionType.APPROVE]: PropertyStatus.APPROVED,
    [ReviewDecisionType.REQUEST_CHANGES]: PropertyStatus.CHANGES_REQUESTED,
    [ReviewDecisionType.REJECT]: PropertyStatus.REJECTED,
  },
  [PropertyStatus.APPROVED]: {
    [ReviewDecisionType.SUSPEND]: PropertyStatus.SUSPENDED,
  },
  [PropertyStatus.SUSPENDED]: {
    [ReviewDecisionType.REACTIVATE]: PropertyStatus.APPROVED,
  },
};

export function getNextPropertyStatus(
  currentStatus: PropertyStatus,
  decision: ReviewDecisionType,
): PropertyStatus | null {
  return transitions[currentStatus]?.[decision] ?? null;
}

export function getAllowedReviewDecisions(
  status: PropertyStatus,
): ReviewDecisionType[] {
  return Object.keys(transitions[status] ?? {}) as ReviewDecisionType[];
}
