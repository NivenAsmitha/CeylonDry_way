import { Prisma, PropertyStatus } from '../../generated/prisma/client.js';
import type { OwnerPropertyResponseDto } from './dto/property-response.dto';

export const ownerPropertySelect = {
  id: true,
  lifecycleStatus: true,
  activeVersionId: true,
  workingVersionId: true,
  createdAt: true,
  updatedAt: true,
  workingVersion: {
    select: {
      id: true,
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
            select: {
              code: true,
              name: true,
              isActive: true,
            },
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
    take: 1,
    select: {
      decision: true,
      reason: true,
      createdAt: true,
    },
  },
} satisfies Prisma.PropertySelect;

export type OwnerPropertyRecord = Prisma.PropertyGetPayload<{
  select: typeof ownerPropertySelect;
}>;

export const editablePropertyStatuses = [
  PropertyStatus.DRAFT,
  PropertyStatus.CHANGES_REQUESTED,
  PropertyStatus.UPDATE_CHANGES_REQUESTED,
] as const;

export function isOwnerEditableStatus(status: PropertyStatus): boolean {
  return editablePropertyStatuses.some(
    (editableStatus) => editableStatus === status,
  );
}

export function mapOwnerProperty(
  property: OwnerPropertyRecord,
): OwnerPropertyResponseDto {
  if (!property.workingVersion) {
    throw new Error('Property has no working version');
  }

  const version = property.workingVersion;
  const hasUnpublishedRevision =
    property.activeVersionId !== property.workingVersionId;
  const canEdit =
    isOwnerEditableStatus(property.lifecycleStatus) ||
    (property.lifecycleStatus === PropertyStatus.APPROVED &&
      hasUnpublishedRevision);
  const latestDecision = property.reviewDecisions?.[0];

  return {
    id: property.id,
    lifecycleStatus: property.lifecycleStatus,
    createdAt: property.createdAt.toISOString(),
    updatedAt: property.updatedAt.toISOString(),
    canEdit,
    canSubmit: canEdit,
    canStartRevision:
      property.lifecycleStatus === PropertyStatus.APPROVED &&
      !hasUnpublishedRevision,
    latestDecision: latestDecision
      ? {
          decision: latestDecision.decision,
          reason: latestDecision.reason,
          createdAt: latestDecision.createdAt.toISOString(),
        }
      : null,
    activeVersion: {
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
      submittedAt: version.submittedAt?.toISOString() ?? null,
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
  };
}
