import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { publicEligibilityWhere } from '../properties/public-eligibility';
import type { FacilityRatingDto } from './dto/facility-rating-response.dto';
import type { UpsertFacilityRatingDto } from './dto/upsert-facility-rating.dto';

const ratingSelect = {
  id: true,
  cleanliness: true,
  safety: true,
  accessibility: true,
  accuracy: true,
  createdAt: true,
  updatedAt: true,
} as const;

function roundAverage(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function mapRating(rating: {
  id: string;
  cleanliness: number;
  safety: number;
  accessibility: number;
  accuracy: number;
  createdAt: Date;
  updatedAt: Date;
}): FacilityRatingDto {
  return {
    ...rating,
    createdAt: rating.createdAt.toISOString(),
    updatedAt: rating.updatedAt.toISOString(),
  };
}

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(propertyId: string) {
    await this.assertPublicPlace(propertyId);
    const aggregate = await this.prisma.facilityRating.aggregate({
      where: { propertyId },
      _count: { _all: true },
      _avg: {
        cleanliness: true,
        safety: true,
        accessibility: true,
        accuracy: true,
      },
    });
    const scores = [
      aggregate._avg.cleanliness,
      aggregate._avg.safety,
      aggregate._avg.accessibility,
      aggregate._avg.accuracy,
    ].filter((score): score is number => score !== null);

    return {
      count: aggregate._count._all,
      overall:
        scores.length === 0
          ? null
          : roundAverage(
              scores.reduce((total, score) => total + score, 0) / scores.length,
            ),
      cleanliness: roundAverage(aggregate._avg.cleanliness),
      safety: roundAverage(aggregate._avg.safety),
      accessibility: roundAverage(aggregate._avg.accessibility),
      accuracy: roundAverage(aggregate._avg.accuracy),
    };
  }

  async mine(propertyId: string, userId: string) {
    await this.assertPublicPlace(propertyId);
    const rating = await this.prisma.facilityRating.findUnique({
      where: { propertyId_userId: { propertyId, userId } },
      select: ratingSelect,
    });

    return rating ? mapRating(rating) : null;
  }

  async upsert(
    propertyId: string,
    userId: string,
    input: UpsertFacilityRatingDto,
  ): Promise<FacilityRatingDto> {
    await this.assertPublicPlace(propertyId);
    const rating = await this.prisma.facilityRating.upsert({
      where: { propertyId_userId: { propertyId, userId } },
      create: { propertyId, userId, ...input },
      update: input,
      select: ratingSelect,
    });

    return mapRating(rating);
  }

  async remove(propertyId: string, userId: string) {
    await this.assertPublicPlace(propertyId);
    const result = await this.prisma.facilityRating.deleteMany({
      where: { propertyId, userId },
    });
    return { deleted: result.count > 0 };
  }

  private async assertPublicPlace(propertyId: string): Promise<void> {
    const place = await this.prisma.property.findFirst({
      where: { id: propertyId, ...publicEligibilityWhere },
      select: { id: true },
    });
    if (!place) throw new NotFoundException('Place not found');
  }
}
