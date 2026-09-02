import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  PropertyStatus,
  ReviewDecisionType,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { ReviewDecisionDto } from './dto/review-decision.dto';
import type { ReviewerListQueryDto } from './dto/reviewer-list-query.dto';
import { reviewerQueueStatuses } from './dto/reviewer-list-query.dto';
import type {
  ReviewerListingDetailDto,
  ReviewerQueueResponseDto,
} from './dto/reviewer-response.dto';
import {
  mapReviewerListing,
  mapReviewerQueueItem,
  reviewerListingSelect,
  reviewerQueueSelect,
} from './reviewer.mapper';
import { getNextPropertyStatus } from './reviewer-transition.policy';

const MINIMUM_REQUIRED_REASON_LENGTH = 10;
const REASON_REQUIRED_DECISIONS = new Set<ReviewDecisionType>([
  ReviewDecisionType.REQUEST_CHANGES,
  ReviewDecisionType.REJECT,
  ReviewDecisionType.SUSPEND,
]);

const notificationTypeByDecision: Readonly<
  Record<ReviewDecisionType, NotificationType>
> = {
  [ReviewDecisionType.APPROVE]: NotificationType.PROPERTY_APPROVED,
  [ReviewDecisionType.REQUEST_CHANGES]:
    NotificationType.PROPERTY_CHANGES_REQUESTED,
  [ReviewDecisionType.REJECT]: NotificationType.PROPERTY_REJECTED,
  [ReviewDecisionType.SUSPEND]: NotificationType.PROPERTY_SUSPENDED,
  [ReviewDecisionType.REACTIVATE]: NotificationType.PROPERTY_REACTIVATED,
};

@Injectable()
export class ReviewerService {
  constructor(private readonly prisma: PrismaService) {}

  async listListings(
    query: ReviewerListQueryDto,
  ): Promise<ReviewerQueueResponseDto> {
    const status = query.status ?? PropertyStatus.PENDING;
    const skip = (query.page - 1) * query.pageSize;
    const where: Prisma.PropertyWhereInput = {
      lifecycleStatus: status,
      workingVersionId: { not: null },
      workingVersion: { submittedAt: { not: null } },
    };
    const [records, total] = await this.prisma.$transaction([
      this.prisma.property.findMany({
        where,
        select: reviewerQueueSelect,
        orderBy: [{ workingVersion: { submittedAt: 'asc' } }, { id: 'asc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      items: records.map(mapReviewerQueueItem),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getListing(
    reviewerId: string,
    propertyId: string,
  ): Promise<ReviewerListingDetailDto> {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        lifecycleStatus: { in: [...reviewerQueueStatuses] },
        workingVersionId: { not: null },
        workingVersion: { submittedAt: { not: null } },
      },
      select: reviewerListingSelect,
    });

    if (!property) {
      throw new NotFoundException('Reviewer listing not found');
    }

    return mapReviewerListing(property, reviewerId);
  }

  async decide(
    reviewerId: string,
    propertyId: string,
    input: ReviewDecisionDto,
  ): Promise<ReviewerListingDetailDto> {
    this.assertReason(input);

    await this.prisma.$transaction(async (transaction) => {
      const property = await transaction.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          ownerUserId: true,
          lifecycleStatus: true,
          activeVersionId: true,
          workingVersionId: true,
          workingVersion: {
            select: { id: true, propertyId: true, submittedAt: true },
          },
          reviewDecisions: {
            where: { decision: ReviewDecisionType.APPROVE },
            orderBy: { createdAt: 'desc' },
            select: { propertyVersionId: true },
          },
        },
      });

      if (
        !property?.workingVersionId ||
        !property.workingVersion?.submittedAt
      ) {
        throw new NotFoundException('Reviewer listing not found');
      }

      if (property.workingVersion.propertyId !== property.id) {
        throw new ConflictException('Submitted property version is invalid');
      }

      if (property.ownerUserId === reviewerId) {
        throw new ForbiddenException(
          'Reviewers cannot decide their own property',
        );
      }

      const nextStatus = getNextPropertyStatus(
        property.lifecycleStatus,
        input.decision,
      );

      if (!nextStatus) {
        throw new ConflictException(
          `Decision ${input.decision} is not valid for status ${property.lifecycleStatus}`,
        );
      }

      if (
        input.decision === ReviewDecisionType.REACTIVATE &&
        !property.reviewDecisions.some(
          (decision) => decision.propertyVersionId === property.activeVersionId,
        )
      ) {
        throw new ConflictException(
          'A valid approved active version is required for reactivation',
        );
      }

      const decidedAt = new Date();
      const updated = await transaction.property.updateMany({
        where: {
          id: property.id,
          lifecycleStatus: property.lifecycleStatus,
          activeVersionId: property.activeVersionId,
          workingVersionId: property.workingVersionId,
        },
        data: {
          lifecycleStatus: nextStatus,
          ...(input.decision === ReviewDecisionType.APPROVE
            ? { activeVersionId: property.workingVersion.id }
            : {}),
          ...(property.lifecycleStatus === PropertyStatus.PENDING_UPDATE &&
          input.decision === ReviewDecisionType.REJECT
            ? { workingVersionId: property.activeVersionId }
            : {}),
          updatedAt: decidedAt,
        },
      });

      if (updated.count !== 1) {
        throw new ConflictException(
          'Property status changed before this decision was completed',
        );
      }

      const reason = input.reason ?? null;
      const fieldNotes = input.fieldNotes?.map((note) => ({
        field: note.field,
        message: note.message,
      }));

      await transaction.reviewDecision.create({
        data: {
          propertyId: property.id,
          propertyVersionId: property.workingVersion.id,
          reviewerId,
          decision: input.decision,
          reason,
          ...(fieldNotes ? { fieldNotes } : {}),
          createdAt: decidedAt,
        },
      });
      await transaction.auditLog.create({
        data: {
          actorId: reviewerId,
          action: `PROPERTY_${input.decision}`,
          targetType: 'PROPERTY',
          targetId: property.id,
          beforeSummary: {
            propertyId: property.id,
            propertyVersionId: property.workingVersion.id,
            lifecycleStatus: property.lifecycleStatus,
          },
          afterSummary: {
            propertyId: property.id,
            propertyVersionId: property.workingVersion.id,
            lifecycleStatus: nextStatus,
          },
          createdAt: decidedAt,
        },
      });
      await transaction.notification.create({
        data: {
          recipientId: property.ownerUserId,
          type: notificationTypeByDecision[input.decision],
          payload: {
            propertyId: property.id,
            propertyVersionId: property.workingVersion.id,
            decision: input.decision,
            lifecycleStatus: nextStatus,
            ...(reason ? { reason } : {}),
          },
          createdAt: decidedAt,
        },
      });
    });

    return this.getListing(reviewerId, propertyId);
  }

  private assertReason(input: ReviewDecisionDto): void {
    if (
      REASON_REQUIRED_DECISIONS.has(input.decision) &&
      (input.reason?.trim().length ?? 0) < MINIMUM_REQUIRED_REASON_LENGTH
    ) {
      throw new BadRequestException({
        code: 'REVIEW_REASON_REQUIRED',
        message: `A reason of at least ${MINIMUM_REQUIRED_REASON_LENGTH} characters is required for ${input.decision}`,
        details: [
          {
            field: 'reason',
            message: `Enter at least ${MINIMUM_REQUIRED_REASON_LENGTH} characters`,
          },
        ],
      });
    }
  }
}
