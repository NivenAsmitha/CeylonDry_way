import {
  PropertyStatus,
  ReviewDecisionType,
} from '../../generated/prisma/client.js';
import {
  getAllowedReviewDecisions,
  getNextPropertyStatus,
} from './reviewer-transition.policy';

describe('reviewer transition policy', () => {
  it.each([
    [
      PropertyStatus.PENDING,
      ReviewDecisionType.APPROVE,
      PropertyStatus.APPROVED,
    ],
    [
      PropertyStatus.PENDING,
      ReviewDecisionType.REQUEST_CHANGES,
      PropertyStatus.CHANGES_REQUESTED,
    ],
    [
      PropertyStatus.PENDING,
      ReviewDecisionType.REJECT,
      PropertyStatus.REJECTED,
    ],
    [
      PropertyStatus.APPROVED,
      ReviewDecisionType.SUSPEND,
      PropertyStatus.SUSPENDED,
    ],
    [
      PropertyStatus.SUSPENDED,
      ReviewDecisionType.REACTIVATE,
      PropertyStatus.APPROVED,
    ],
  ])('%s + %s transitions to %s', (status, decision, expected) => {
    expect(getNextPropertyStatus(status, decision)).toBe(expected);
  });

  it('rejects every transition not explicitly declared', () => {
    expect(
      getNextPropertyStatus(PropertyStatus.DRAFT, ReviewDecisionType.APPROVE),
    ).toBeNull();
    expect(
      getNextPropertyStatus(PropertyStatus.APPROVED, ReviewDecisionType.REJECT),
    ).toBeNull();
    expect(getAllowedReviewDecisions(PropertyStatus.REJECTED)).toEqual([]);
  });
});
