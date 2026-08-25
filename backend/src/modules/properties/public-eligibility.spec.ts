import { PropertyStatus } from '../../generated/prisma/client.js';
import {
  isPubliclyEligible,
  publicEligibilityWhere,
} from './public-eligibility';

describe('public property eligibility', () => {
  it('requires APPROVED with a non-null active version', () => {
    expect(
      isPubliclyEligible({
        lifecycleStatus: PropertyStatus.APPROVED,
        activeVersionId: 'approved-version',
      }),
    ).toBe(true);
    expect(
      isPubliclyEligible({
        lifecycleStatus: PropertyStatus.APPROVED,
        activeVersionId: null,
      }),
    ).toBe(false);
  });

  it.each([
    PropertyStatus.DRAFT,
    PropertyStatus.PENDING,
    PropertyStatus.CHANGES_REQUESTED,
    PropertyStatus.PENDING_UPDATE,
    PropertyStatus.REJECTED,
    PropertyStatus.SUSPENDED,
    PropertyStatus.ARCHIVED,
  ])('keeps %s private even when an active version exists', (status) => {
    expect(
      isPubliclyEligible({
        lifecycleStatus: status,
        activeVersionId: 'not-public',
      }),
    ).toBe(false);
  });

  it('exports the same focused query invariant for future public services', () => {
    expect(publicEligibilityWhere).toEqual({
      lifecycleStatus: PropertyStatus.APPROVED,
      activeVersionId: { not: null },
    });
  });
});
