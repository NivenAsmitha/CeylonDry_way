import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReviewModerationStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { publicEligibilityWhere } from '../properties/public-eligibility';
import type { FacilityRatingDto } from './dto/facility-rating-response.dto';
import {
  RatingModerationAction,
  type ModerateRatingReviewDto,
} from './dto/moderate-rating-review.dto';
import type {
  PublicRatingReviewQueryDto,
  StaffRatingReviewQueryDto,
} from './dto/rating-review-query.dto';
import type { UpsertRatingReplyDto } from './dto/rating-reply.dto';
import type { UpsertFacilityRatingDto } from './dto/upsert-facility-rating.dto';

const ratingSelect = {
  id: true,
  cleanliness: true,
  safety: true,
  accessibility: true,
  accuracy: true,
  reviewText: true,
  visitDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

function roundAverage(value: number | null): number | null {
  return value === null ? null : Math.round(value * 10) / 10;
}

function isoDateOnly(value: Date | null): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

function mapRating(rating: {
  id: string;
  cleanliness: number;
  safety: number;
  accessibility: number;
  accuracy: number;
  reviewText: string | null;
  visitDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}): FacilityRatingDto {
  return {
    ...rating,
    visitDate: isoDateOnly(rating.visitDate),
    createdAt: rating.createdAt.toISOString(),
    updatedAt: rating.updatedAt.toISOString(),
  };
}

function nextModerationStatus(
  action: RatingModerationAction,
): ReviewModerationStatus {
  return action === RatingModerationAction.HIDE
    ? ReviewModerationStatus.HIDDEN
    : ReviewModerationStatus.VISIBLE;
}

@Injectable()
export class RatingsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(propertyId: string) {
    await this.assertPublicPlace(propertyId);
    const aggregate = await this.prisma.facilityRating.aggregate({
      where: { propertyId, moderationStatus: ReviewModerationStatus.VISIBLE },
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

  async publicReviews(propertyId: string, query: PublicRatingReviewQueryDto) {
    await this.assertPublicPlace(propertyId);
    const where: Prisma.FacilityRatingWhereInput = {
      propertyId,
      reviewText: { not: null },
      moderationStatus: ReviewModerationStatus.VISIBLE,
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.facilityRating.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: {
          ...ratingSelect,
          user: { select: { id: true, name: true } },
          reply: {
            where: { moderationStatus: ReviewModerationStatus.VISIBLE },
            select: {
              id: true,
              message: true,
              createdAt: true,
              updatedAt: true,
              author: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.facilityRating.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...mapRating(item),
        author: item.user,
        reply: item.reply
          ? {
              ...item.reply,
              createdAt: item.reply.createdAt.toISOString(),
              updatedAt: item.reply.updatedAt.toISOString(),
            }
          : null,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
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
    const place = await this.assertPublicPlace(propertyId);
    if (place.ownerUserId === userId) {
      throw new ForbiddenException('You cannot review your own property');
    }
    const data = {
      cleanliness: input.cleanliness,
      safety: input.safety,
      accessibility: input.accessibility,
      accuracy: input.accuracy,
      reviewText: input.reviewText ?? null,
      visitDate: input.visitDate
        ? new Date(`${input.visitDate}T00:00:00Z`)
        : null,
    };
    const rating = await this.prisma.facilityRating.upsert({
      where: { propertyId_userId: { propertyId, userId } },
      create: { propertyId, userId, ...data },
      update: data,
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

  async upsertOwnerReply(
    reviewId: string,
    ownerId: string,
    input: UpsertRatingReplyDto,
  ) {
    const review = await this.prisma.facilityRating.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        reviewText: true,
        moderationStatus: true,
        property: { select: { id: true, ownerUserId: true } },
      },
    });
    if (!review?.reviewText) throw new NotFoundException('Review not found');
    if (review.property.ownerUserId !== ownerId) {
      throw new ForbiddenException('Only the property owner can reply');
    }
    if (review.moderationStatus !== ReviewModerationStatus.VISIBLE) {
      throw new ConflictException('A hidden review cannot receive a reply');
    }

    const reply = await this.prisma.$transaction(async (transaction) => {
      const saved = await transaction.facilityRatingReply.upsert({
        where: { ratingId: review.id },
        create: {
          ratingId: review.id,
          authorId: ownerId,
          message: input.message,
        },
        update: {
          message: input.message,
          moderationStatus: ReviewModerationStatus.VISIBLE,
          moderationReason: null,
          moderatedById: null,
          moderatedAt: null,
        },
        select: {
          id: true,
          message: true,
          createdAt: true,
          updatedAt: true,
          author: { select: { id: true, name: true } },
        },
      });
      if (review.userId !== ownerId) {
        await transaction.notification.create({
          data: {
            recipientId: review.userId,
            type: NotificationType.REVIEW_OWNER_REPLY,
            payload: { propertyId: review.property.id, reviewId: review.id },
          },
        });
      }
      return saved;
    });

    return {
      ...reply,
      createdAt: reply.createdAt.toISOString(),
      updatedAt: reply.updatedAt.toISOString(),
    };
  }

  async deleteOwnerReply(reviewId: string, ownerId: string) {
    const reply = await this.prisma.facilityRatingReply.findUnique({
      where: { ratingId: reviewId },
      select: {
        id: true,
        rating: {
          select: { property: { select: { ownerUserId: true } } },
        },
      },
    });
    if (!reply) return { deleted: false };
    if (reply.rating.property.ownerUserId !== ownerId) {
      throw new ForbiddenException(
        'Only the property owner can delete this reply',
      );
    }
    await this.prisma.facilityRatingReply.delete({ where: { id: reply.id } });
    return { deleted: true };
  }

  async staffReviews(query: StaffRatingReviewQueryDto) {
    const where: Prisma.FacilityRatingWhereInput = {
      reviewText: { not: null },
      ...(query.status ? { moderationStatus: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { reviewText: { contains: query.search, mode: 'insensitive' } },
              {
                user: {
                  is: { name: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                user: {
                  is: {
                    email: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
              {
                property: {
                  is: {
                    activeVersion: {
                      is: {
                        name: { contains: query.search, mode: 'insensitive' },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.facilityRating.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: {
          ...ratingSelect,
          moderationStatus: true,
          moderationReason: true,
          moderatedAt: true,
          user: { select: { id: true, name: true, email: true } },
          property: {
            select: {
              id: true,
              ownerUserId: true,
              activeVersion: { select: { name: true, city: true } },
            },
          },
          reply: {
            select: {
              id: true,
              message: true,
              moderationStatus: true,
              moderationReason: true,
              createdAt: true,
              updatedAt: true,
              author: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.facilityRating.count({ where }),
    ]);
    return {
      items: items.map((item) => ({
        ...mapRating(item),
        moderationStatus: item.moderationStatus,
        moderationReason: item.moderationReason,
        moderatedAt: item.moderatedAt?.toISOString() ?? null,
        author: item.user,
        property: item.property,
        reply: item.reply
          ? {
              ...item.reply,
              createdAt: item.reply.createdAt.toISOString(),
              updatedAt: item.reply.updatedAt.toISOString(),
            }
          : null,
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async moderateReview(
    actorId: string,
    reviewId: string,
    input: ModerateRatingReviewDto,
  ) {
    const nextStatus = nextModerationStatus(input.action);
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.facilityRating.findUnique({
        where: { id: reviewId },
        select: { id: true, moderationStatus: true, moderationReason: true },
      });
      if (!current) throw new NotFoundException('Review not found');
      if (current.moderationStatus === nextStatus) {
        throw new ConflictException(
          `Review is already ${nextStatus.toLowerCase()}`,
        );
      }
      await transaction.facilityRating.update({
        where: { id: reviewId },
        data: {
          moderationStatus: nextStatus,
          moderationReason: input.reason,
          moderatedById: actorId,
          moderatedAt: new Date(),
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: `REVIEW_CONTENT_${input.action}`,
          targetType: 'FACILITY_REVIEW',
          targetId: reviewId,
          beforeSummary: current,
          afterSummary: { moderationStatus: nextStatus, reason: input.reason },
        },
      });
      return { id: reviewId, moderationStatus: nextStatus };
    });
  }

  async moderateReply(
    actorId: string,
    replyId: string,
    input: ModerateRatingReviewDto,
  ) {
    const nextStatus = nextModerationStatus(input.action);
    return this.prisma.$transaction(async (transaction) => {
      const current = await transaction.facilityRatingReply.findUnique({
        where: { id: replyId },
        select: { id: true, moderationStatus: true, moderationReason: true },
      });
      if (!current) throw new NotFoundException('Owner reply not found');
      if (current.moderationStatus === nextStatus) {
        throw new ConflictException(
          `Owner reply is already ${nextStatus.toLowerCase()}`,
        );
      }
      await transaction.facilityRatingReply.update({
        where: { id: replyId },
        data: {
          moderationStatus: nextStatus,
          moderationReason: input.reason,
          moderatedById: actorId,
          moderatedAt: new Date(),
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId,
          action: `REVIEW_REPLY_${input.action}`,
          targetType: 'FACILITY_REVIEW_REPLY',
          targetId: replyId,
          beforeSummary: current,
          afterSummary: { moderationStatus: nextStatus, reason: input.reason },
        },
      });
      return { id: replyId, moderationStatus: nextStatus };
    });
  }

  private async assertPublicPlace(propertyId: string): Promise<{
    id: string;
    ownerUserId: string;
  }> {
    const place = await this.prisma.property.findFirst({
      where: { id: propertyId, ...publicEligibilityWhere },
      select: { id: true, ownerUserId: true },
    });
    if (!place) throw new NotFoundException('Place not found');
    return place;
  }
}
