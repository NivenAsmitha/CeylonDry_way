import { Prisma } from '../../generated/prisma/client.js';
import type {
  ReviewerListingDetailDto,
  ReviewerQueueItemDto,
} from './dto/reviewer-response.dto';
import { getAllowedReviewDecisions } from './reviewer-transition.policy';

export const reviewerQueueSelect = {
  id: true,
  lifecycleStatus: true,
  owner: { select: { name: true } },
  activeVersion: {
    select: {
      id: true,
      version: true,
      name: true,
      propertyType: true,
      district: true,
      city: true,
      submittedAt: true,
    },
  },
} satisfies Prisma.PropertySelect;

export const reviewerListingSelect = {
  id: true,
  ownerUserId: true,
  lifecycleStatus: true,
  owner: { select: { name: true } },
  activeVersion: {
    select: {
      id: true,
      propertyId: true,
      version: true,
      propertyType: true,
      name: true,
      organisation: true,
      description: true,
      accessNotes: true,
      isFree: true,
      feeLkr: true,
      phone: true,
      email: true,
      website: true,
      address: true,
      district: true,
      city: true,
      latitude: true,
      longitude: true,
      submittedAt: true,
      amenities: {
        select: {
          notes: true,
          amenity: {
            select: { code: true, name: true, isActive: true },
          },
        },
      },
      openingHours: {
        select: {
          weekday: true,
          openTime: true,
          closeTime: true,
          isClosed: true,
          is24Hours: true,
        },
      },
      photos: {
        select: {
          id: true,
          url: true,
          sortOrder: true,
          isCover: true,
          altText: true,
        },
      },
    },
  },
  reviewDecisions: {
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    select: {
      id: true,
      decision: true,
      reason: true,
      fieldNotes: true,
      createdAt: true,
      reviewer: { select: { name: true } },
    },
  },
} satisfies Prisma.PropertySelect;

export type ReviewerQueueRecord = Prisma.PropertyGetPayload<{
  select: typeof reviewerQueueSelect;
}>;

export type ReviewerListingRecord = Prisma.PropertyGetPayload<{
  select: typeof reviewerListingSelect;
}>;

interface SafeFieldNote {
  field: string;
  message: string;
}

function mapFieldNotes(value: Prisma.JsonValue | null): SafeFieldNote[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const notes = value.flatMap((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      Array.isArray(item) ||
      typeof item.field !== 'string' ||
      typeof item.message !== 'string'
    ) {
      return [];
    }

    return [{ field: item.field, message: item.message }];
  });

  return notes.length > 0 ? notes : null;
}

export function mapReviewerQueueItem(
  property: ReviewerQueueRecord,
): ReviewerQueueItemDto {
  const version = property.activeVersion;

  if (!version?.submittedAt) {
    throw new Error('Reviewer queue record has no submitted version');
  }

  return {
    propertyId: property.id,
    propertyVersionId: version.id,
    version: version.version,
    name: version.name,
    propertyType: version.propertyType,
    district: version.district,
    city: version.city,
    lifecycleStatus: property.lifecycleStatus,
    submittedAt: version.submittedAt.toISOString(),
    owner: { name: property.owner.name },
  };
}

export function mapReviewerListing(
  property: ReviewerListingRecord,
  reviewerId: string,
): ReviewerListingDetailDto {
  const version = property.activeVersion;

  if (!version?.submittedAt) {
    throw new Error('Reviewer listing has no submitted version');
  }

  return {
    propertyId: property.id,
    lifecycleStatus: property.lifecycleStatus,
    owner: { name: property.owner.name },
    submittedVersion: {
      id: version.id,
      version: version.version,
      propertyType: version.propertyType,
      name: version.name,
      organisation: version.organisation,
      description: version.description,
      accessNotes: version.accessNotes,
      isFree: version.isFree,
      feeLkr: version.feeLkr?.toNumber() ?? null,
      phone: version.phone,
      email: version.email,
      website: version.website,
      address: version.address,
      district: version.district,
      city: version.city,
      latitude: version.latitude?.toNumber() ?? null,
      longitude: version.longitude?.toNumber() ?? null,
      submittedAt: version.submittedAt.toISOString(),
      amenities: version.amenities
        .filter((selection) => selection.amenity.isActive)
        .map((selection) => ({
          code: selection.amenity.code,
          name: selection.amenity.name,
          notes: selection.notes,
        }))
        .sort((left, right) => left.name.localeCompare(right.name)),
      openingHours: version.openingHours
        .map((openingHour) => ({
          weekday: openingHour.weekday,
          openTime: openingHour.openTime,
          closeTime: openingHour.closeTime,
          isClosed: openingHour.isClosed,
          is24Hours: openingHour.is24Hours,
        }))
        .sort((left, right) => left.weekday - right.weekday),
      photos: version.photos
        .map((photo) => ({
          id: photo.id,
          url: photo.url,
          sortOrder: photo.sortOrder,
          isCover: photo.isCover,
          altText: photo.altText,
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder),
    },
    allowedDecisions:
      property.ownerUserId === reviewerId
        ? []
        : getAllowedReviewDecisions(property.lifecycleStatus),
    decisionHistory: property.reviewDecisions.map((reviewDecision) => ({
      id: reviewDecision.id,
      decision: reviewDecision.decision,
      reason: reviewDecision.reason,
      fieldNotes: mapFieldNotes(reviewDecision.fieldNotes),
      createdAt: reviewDecision.createdAt.toISOString(),
      reviewer: { name: reviewDecision.reviewer.name },
    })),
  };
}
