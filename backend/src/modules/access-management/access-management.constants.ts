import { PermissionKey, RoleName } from '../../generated/prisma/client.js';

export const MANAGED_ACCESS_ROLES = [
  RoleName.ADMIN,
  RoleName.REVIEWER,
] as const;

export const PERMISSION_CATALOG: ReadonlyArray<{
  key: PermissionKey;
  name: string;
  description: string;
  availableTo: readonly (typeof MANAGED_ACCESS_ROLES)[number][];
}> = [
  {
    key: PermissionKey.USER_MANAGEMENT,
    name: 'User management',
    description: 'View, edit, suspend and restore eligible user accounts.',
    availableTo: [RoleName.ADMIN],
  },
  {
    key: PermissionKey.REVIEWER_MANAGEMENT,
    name: 'Reviewer management',
    description: 'Create reviewer accounts and manage reviewer access.',
    availableTo: [RoleName.ADMIN],
  },
  {
    key: PermissionKey.PROPERTY_MANAGEMENT,
    name: 'Property management',
    description:
      'Manage facility records and administrative lifecycle actions.',
    availableTo: [RoleName.ADMIN],
  },
  {
    key: PermissionKey.REPORT_MANAGEMENT,
    name: 'Report management',
    description: 'Review and resolve community reports about facilities.',
    availableTo: [RoleName.ADMIN],
  },
  {
    key: PermissionKey.LISTING_REVIEW,
    name: 'Listing review',
    description: 'Review submitted listings and approve or return them.',
    availableTo: [RoleName.REVIEWER],
  },
  {
    key: PermissionKey.MANUAL_PROPERTY_MANAGEMENT,
    name: 'Manual property management',
    description: 'Create and maintain staff-authored facility listings.',
    availableTo: [RoleName.REVIEWER],
  },
  {
    key: PermissionKey.REVIEW_MODERATION,
    name: 'Review moderation',
    description: 'Hide or restore facility reviews and owner replies.',
    availableTo: [RoleName.ADMIN, RoleName.REVIEWER],
  },
  {
    key: PermissionKey.SUPPORT_MANAGEMENT,
    name: 'Support management',
    description: 'Read, claim and answer private client support requests.',
    availableTo: [RoleName.ADMIN, RoleName.REVIEWER],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_CATALOG.map(({ key }) => key);
