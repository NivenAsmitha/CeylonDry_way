import { Prisma } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { normalizeRoleSet } from '../roles/role-combination.policy';

const PERMISSION_ORDER = [
  'USER_MANAGEMENT',
  'REVIEWER_MANAGEMENT',
  'PROPERTY_MANAGEMENT',
  'REPORT_MANAGEMENT',
  'LISTING_REVIEW',
  'MANUAL_PROPERTY_MANAGEMENT',
  'REVIEW_MODERATION',
  'SUPPORT_MANAGEMENT',
] as const;

export const safeUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  language: true,
  status: true,
  deletedAt: true,
  createdAt: true,
  roles: {
    select: {
      role: {
        select: {
          name: true,
          permissions: {
            select: {
              permission: { select: { key: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

export type SafeUserRecord = Prisma.UserGetPayload<{
  select: typeof safeUserSelect;
}>;

export function mapSafeUser(user: SafeUserRecord): AuthenticatedUser {
  const roleNames = normalizeRoleSet(user.roles.map(({ role }) => role.name));
  const assignedPermissions = new Set(
    user.roles.flatMap(({ role }) =>
      (role.permissions ?? []).map(({ permission }) => permission.key),
    ),
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    language: user.language,
    status: user.status,
    roles: roleNames,
    permissions: roleNames.includes('DEVELOPER')
      ? [...PERMISSION_ORDER]
      : PERMISSION_ORDER.filter((permission) =>
          assignedPermissions.has(permission),
        ),
    createdAt: user.createdAt,
  };
}
