import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  Prisma,
  PropertyStatus,
  PropertyType,
  ReviewDecisionType,
} from '../../generated/prisma/client.js';
import type { PrismaService } from '../../prisma/prisma.service';
import { ReviewerService } from './reviewer.service';

const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const OWNER_ID = 'owner-user';
const REVIEWER_ID = 'reviewer-user';
const submittedAt = new Date('2026-08-25T01:00:00.000Z');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function decisionProperty(status: PropertyStatus) {
  return {
    id: PROPERTY_ID,
    ownerUserId: OWNER_ID,
    lifecycleStatus: status,
    activeVersionId: VERSION_ID,
    activeVersion: {
      id: VERSION_ID,
      propertyId: PROPERTY_ID,
      submittedAt,
    },
    reviewDecisions:
      status === PropertyStatus.SUSPENDED
        ? [{ propertyVersionId: VERSION_ID }]
        : [],
  };
}

function detailProperty(status: PropertyStatus) {
  return {
    id: PROPERTY_ID,
    ownerUserId: OWNER_ID,
    lifecycleStatus: status,
    owner: { name: 'Property Owner' },
    activeVersion: {
      id: VERSION_ID,
      propertyId: PROPERTY_ID,
      version: 1,
      propertyType: PropertyType.HOTEL,
      name: 'Safe property',
      organisation: null,
      description: 'A sufficiently detailed property description.',
      accessNotes: 'Use the main entrance.',
      isFree: true,
      feeLkr: null,
      phone: null,
      email: null,
      website: null,
      address: '1 Test Road',
      district: 'Colombo',
      city: 'Colombo',
      latitude: new Prisma.Decimal(6.9271),
      longitude: new Prisma.Decimal(79.8612),
      submittedAt,
      amenities: [],
      openingHours: [],
      photos: [],
    },
    reviewDecisions: [],
  };
}

describe('ReviewerService', () => {
  let service: ReviewerService;
  let transaction: {
    property: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    reviewDecision: { create: jest.Mock };
    auditLog: { create: jest.Mock };
    notification: { create: jest.Mock };
  };
  let propertyFindFirst: jest.Mock;
  let runTransaction: jest.Mock;
  let updateInputs: unknown[];

  beforeEach(() => {
    updateInputs = [];
    transaction = {
      property: {
        findUnique: jest
          .fn()
          .mockResolvedValue(decisionProperty(PropertyStatus.PENDING)),
        updateMany: jest.fn().mockImplementation((input: unknown) => {
          updateInputs.push(input);
          return Promise.resolve({ count: 1 });
        }),
      },
      reviewDecision: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };
    propertyFindFirst = jest
      .fn()
      .mockResolvedValue(detailProperty(PropertyStatus.APPROVED));
    runTransaction = jest
      .fn()
      .mockImplementation((callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
      );
    const prisma = {
      property: { findFirst: propertyFindFirst },
      $transaction: runTransaction,
    } as unknown as PrismaService;

    service = new ReviewerService(prisma);
  });

  it('approves atomically, pins the reviewed version, and records decision, audit, and notification', async () => {
    const result = await service.decide(REVIEWER_ID, PROPERTY_ID, {
      decision: ReviewDecisionType.APPROVE,
      reason: 'Submission is complete.',
    });

    const updateInput: unknown = updateInputs[0];

    expect(updateInput).toMatchObject({
      where: {
        lifecycleStatus: PropertyStatus.PENDING,
        activeVersionId: VERSION_ID,
      },
      data: {
        lifecycleStatus: PropertyStatus.APPROVED,
        activeVersionId: VERSION_ID,
      },
    });
    expect(transaction.reviewDecision.create).toHaveBeenCalledTimes(1);
    expect(transaction.auditLog.create).toHaveBeenCalledTimes(1);
    expect(transaction.notification.create).toHaveBeenCalledTimes(1);
    expect(result.lifecycleStatus).toBe(PropertyStatus.APPROVED);
  });

  it.each([
    [ReviewDecisionType.REQUEST_CHANGES, PropertyStatus.CHANGES_REQUESTED],
    [ReviewDecisionType.REJECT, PropertyStatus.REJECTED],
  ])('applies %s without changing activeVersionId', async (decision, next) => {
    propertyFindFirst.mockResolvedValue(detailProperty(next));

    await service.decide(REVIEWER_ID, PROPERTY_ID, {
      decision,
      reason: 'A meaningful and safe reviewer explanation.',
    });

    const updateInput: unknown = updateInputs[0];
    const updateData =
      isRecord(updateInput) && isRecord(updateInput.data)
        ? updateInput.data
        : null;

    expect(updateData).not.toHaveProperty('activeVersionId');
    expect(updateData).toMatchObject({ lifecycleStatus: next });
  });

  it('requires a meaningful reason for change, reject, and suspend decisions', async () => {
    await expect(
      service.decide(REVIEWER_ID, PROPERTY_ID, {
        decision: ReviewDecisionType.REQUEST_CHANGES,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(runTransaction).not.toHaveBeenCalled();
  });

  it('prevents an owner-reviewer from deciding their own property', async () => {
    await expect(
      service.decide(OWNER_ID, PROPERTY_ID, {
        decision: ReviewDecisionType.APPROVE,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(transaction.property.updateMany).not.toHaveBeenCalled();
  });

  it('rejects an invalid transition before creating workflow records', async () => {
    transaction.property.findUnique.mockResolvedValue(
      decisionProperty(PropertyStatus.APPROVED),
    );

    await expect(
      service.decide(REVIEWER_ID, PROPERTY_ID, {
        decision: ReviewDecisionType.REJECT,
        reason: 'This cannot be applied to an approved listing.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transaction.reviewDecision.create).not.toHaveBeenCalled();
  });

  it('requires an approved active version before reactivation', async () => {
    const suspended = decisionProperty(PropertyStatus.SUSPENDED);
    suspended.reviewDecisions = [];
    transaction.property.findUnique.mockResolvedValue(suspended);

    await expect(
      service.decide(REVIEWER_ID, PROPERTY_ID, {
        decision: ReviewDecisionType.REACTIVATE,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('makes a stale second decision fail safely', async () => {
    transaction.property.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const [first, second] = await Promise.allSettled([
      service.decide(REVIEWER_ID, PROPERTY_ID, {
        decision: ReviewDecisionType.APPROVE,
      }),
      service.decide('second-reviewer', PROPERTY_ID, {
        decision: ReviewDecisionType.APPROVE,
      }),
    ]);

    expect(first.status).toBe('fulfilled');
    expect(second.status).toBe('rejected');
    expect(transaction.reviewDecision.create).toHaveBeenCalledTimes(1);
  });
});
