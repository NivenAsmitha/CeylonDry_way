import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RatingsService } from './ratings.service';

describe('RatingsService', () => {
  const property = { findFirst: jest.fn() };
  const facilityRating = {
    aggregate: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  };
  const prisma = { property, facilityRating } as unknown as PrismaService;
  const service = new RatingsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    property.findFirst.mockResolvedValue({ id: 'property-1' });
  });

  it('returns rounded public category averages and an overall score', async () => {
    facilityRating.aggregate.mockResolvedValue({
      _count: { _all: 3 },
      _avg: {
        cleanliness: 4.333,
        safety: 4,
        accessibility: 3.667,
        accuracy: 4.667,
      },
    });

    await expect(service.summary('property-1')).resolves.toEqual({
      count: 3,
      overall: 4.2,
      cleanliness: 4.3,
      safety: 4,
      accessibility: 3.7,
      accuracy: 4.7,
    });
  });

  it('returns an empty summary when a facility has no ratings', async () => {
    facilityRating.aggregate.mockResolvedValue({
      _count: { _all: 0 },
      _avg: {
        cleanliness: null,
        safety: null,
        accessibility: null,
        accuracy: null,
      },
    });

    await expect(service.summary('property-1')).resolves.toEqual({
      count: 0,
      overall: null,
      cleanliness: null,
      safety: null,
      accessibility: null,
      accuracy: null,
    });
  });

  it('upserts one rating per property and user', async () => {
    const now = new Date('2026-09-01T12:00:00.000Z');
    facilityRating.upsert.mockResolvedValue({
      id: 'rating-1',
      cleanliness: 5,
      safety: 4,
      accessibility: 3,
      accuracy: 5,
      createdAt: now,
      updatedAt: now,
    });

    await expect(
      service.upsert('property-1', 'user-1', {
        cleanliness: 5,
        safety: 4,
        accessibility: 3,
        accuracy: 5,
      }),
    ).resolves.toMatchObject({
      id: 'rating-1',
      cleanliness: 5,
      updatedAt: now.toISOString(),
    });
    expect(facilityRating.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          propertyId_userId: {
            propertyId: 'property-1',
            userId: 'user-1',
          },
        },
      }),
    );
  });

  it('rejects ratings for facilities that are not publicly approved', async () => {
    property.findFirst.mockResolvedValue(null);

    await expect(service.summary('property-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(facilityRating.aggregate).not.toHaveBeenCalled();
  });

  it('prevents a property owner from reviewing their own facility', async () => {
    property.findFirst.mockResolvedValue({
      id: 'property-1',
      ownerUserId: 'owner-1',
    });

    await expect(
      service.upsert('property-1', 'owner-1', {
        cleanliness: 5,
        safety: 5,
        accessibility: 5,
        accuracy: 5,
        reviewText: 'This should not be accepted.',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(facilityRating.upsert).not.toHaveBeenCalled();
  });
});
