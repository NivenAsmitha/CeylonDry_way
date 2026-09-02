import { PropertyStatus } from '../../generated/prisma/client.js';
import {
  isPubliclyEligible,
  publicEligibilityWhere,
} from './public-eligibility';

describe('public property eligibility', () => {
  it('requires a public lifecycle status with a non-null published version', () => {
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
    PropertyStatus.PENDING_UPDATE,
    PropertyStatus.UPDATE_CHANGES_REQUESTED,
  ])('keeps the approved version public while status is %s', (status) => {
    expect(
      isPubliclyEligible({
        lifecycleStatus: status,
        activeVersionId: 'approved-version',
      }),
    ).toBe(true);
  });

  it.each([
    PropertyStatus.DRAFT,
    PropertyStatus.PENDING,
    PropertyStatus.CHANGES_REQUESTED,
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
      lifecycleStatus: {
        in: [
          PropertyStatus.APPROVED,
          PropertyStatus.PENDING_UPDATE,
          PropertyStatus.UPDATE_CHANGES_REQUESTED,
        ],
      },
      activeVersionId: { not: null },
    });
  });
});
