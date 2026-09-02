import { Prisma, PropertyStatus } from '../../generated/prisma/client.js';

export interface PublicEligibilityCandidate {
  lifecycleStatus: PropertyStatus;
  activeVersionId: string | null;
}

export const publicPropertyStatuses = [
  PropertyStatus.APPROVED,
  PropertyStatus.PENDING_UPDATE,
  PropertyStatus.UPDATE_CHANGES_REQUESTED,
] as const;

export const publicEligibilityWhere: Prisma.PropertyWhereInput = {
  lifecycleStatus: { in: [...publicPropertyStatuses] },
  activeVersionId: { not: null },
};

export const publicEligibilitySql = Prisma.sql`
  p."lifecycleStatus" IN (
    ${PropertyStatus.APPROVED}::"PropertyStatus",
    ${PropertyStatus.PENDING_UPDATE}::"PropertyStatus",
    ${PropertyStatus.UPDATE_CHANGES_REQUESTED}::"PropertyStatus"
  )
  AND p."activeVersionId" IS NOT NULL
  AND pv.id = p."activeVersionId"
  AND pv."propertyId" = p.id
  AND pv."submittedAt" IS NOT NULL
  AND pv.name IS NOT NULL
  AND pv."propertyType" IS NOT NULL
  AND pv.address IS NOT NULL
  AND pv.district IS NOT NULL
  AND pv.city IS NOT NULL
  AND pv.latitude IS NOT NULL
  AND pv.longitude IS NOT NULL
`;

export function isPubliclyEligible(
  property: PublicEligibilityCandidate,
): boolean {
  return (
    publicPropertyStatuses.some(
      (status) => status === property.lifecycleStatus,
    ) && property.activeVersionId !== null
  );
}
