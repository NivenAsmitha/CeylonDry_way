import { Prisma, PropertyStatus } from '../../generated/prisma/client.js';

export interface PublicEligibilityCandidate {
  lifecycleStatus: PropertyStatus;
  activeVersionId: string | null;
}

export const publicEligibilityWhere = {
  lifecycleStatus: PropertyStatus.APPROVED,
  activeVersionId: { not: null },
} as const;

export const publicEligibilitySql = Prisma.sql`
  p."lifecycleStatus" = ${PropertyStatus.APPROVED}::"PropertyStatus"
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
    property.lifecycleStatus === PropertyStatus.APPROVED &&
    property.activeVersionId !== null
  );
}
