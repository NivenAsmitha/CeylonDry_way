import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '../../generated/prisma/client.js';
import {
  assertAllowedRoleCombination,
  hasExactRoleSet,
  isAllowedRoleCombination,
} from '../roles/role-combination.policy';

export const USER_MANAGEMENT_ACTIONS = [
  'VIEW',
  'EDIT_PROFILE',
  'CHANGE_ROLES',
  'CHANGE_STATUS',
  'SOFT_DELETE',
  'RESTORE',
  'INITIATE_PASSWORD_RESET',
  'REVOKE_SESSIONS',
] as const;

export type UserManagementAction = (typeof USER_MANAGEMENT_ACTIONS)[number];

export type UserManagementDenialCategory =
  | 'INVALID_ACTOR_ROLE_SET'
  | 'INSUFFICIENT_ACTOR_ROLE'
  | 'INVALID_TARGET_ROLE_SET'
  | 'ACTOR_TARGET_SAME'
  | 'ADMIN_TARGET_OUTSIDE_AUTHORITY';

const DESTRUCTIVE_ACTIONS = new Set<UserManagementAction>([
  'CHANGE_ROLES',
  'CHANGE_STATUS',
  'SOFT_DELETE',
  'RESTORE',
]);

export function getManagementActorRole(
  roles: readonly RoleName[],
): typeof RoleName.ADMIN | typeof RoleName.DEVELOPER | null {
  assertAllowedRoleCombination(roles);

  if (hasExactRoleSet(roles, [RoleName.ADMIN])) {
    return RoleName.ADMIN;
  }
  if (hasExactRoleSet(roles, [RoleName.DEVELOPER])) {
    return RoleName.DEVELOPER;
  }

  return null;
}

export function canManageUser(
  actorId: string,
  actorRoles: readonly RoleName[],
  targetId: string,
  targetRoles: readonly RoleName[],
  action: UserManagementAction,
): boolean {
  return (
    getUserManagementDenialCategory(
      actorId,
      actorRoles,
      targetId,
      targetRoles,
      action,
    ) === null
  );
}

export function getUserManagementDenialCategory(
  actorId: string,
  actorRoles: readonly RoleName[],
  targetId: string,
  targetRoles: readonly RoleName[],
  action: UserManagementAction,
): UserManagementDenialCategory | null {
  let actorRole: typeof RoleName.ADMIN | typeof RoleName.DEVELOPER | null;

  try {
    actorRole = getManagementActorRole(actorRoles);
  } catch {
    return 'INVALID_ACTOR_ROLE_SET';
  }

  if (!actorRole) {
    return 'INSUFFICIENT_ACTOR_ROLE';
  }
  if (!isAllowedRoleCombination(targetRoles)) {
    return 'INVALID_TARGET_ROLE_SET';
  }

  if (
    actorRole === RoleName.ADMIN &&
    ![
      [RoleName.CLIENT],
      [RoleName.CLIENT, RoleName.OWNER],
      [RoleName.REVIEWER],
    ].some((allowedRoles) => hasExactRoleSet(targetRoles, allowedRoles))
  ) {
    return 'ADMIN_TARGET_OUTSIDE_AUTHORITY';
  }

  if (DESTRUCTIVE_ACTIONS.has(action) && actorId === targetId) {
    return 'ACTOR_TARGET_SAME';
  }

  return null;
}

export function assertCanManageUser(
  actorId: string,
  actorRoles: readonly RoleName[],
  targetId: string,
  targetRoles: readonly RoleName[],
  action: UserManagementAction,
): void {
  if (!canManageUser(actorId, actorRoles, targetId, targetRoles, action)) {
    throw new ForbiddenException(
      'This account action is not permitted by the management hierarchy',
    );
  }
}

export function getAllowedUserManagementActions(
  actorId: string,
  actorRoles: readonly RoleName[],
  targetId: string,
  targetRoles: readonly RoleName[],
): UserManagementAction[] {
  return USER_MANAGEMENT_ACTIONS.filter((action) =>
    canManageUser(actorId, actorRoles, targetId, targetRoles, action),
  );
}
