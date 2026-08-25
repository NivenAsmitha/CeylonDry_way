import { ForbiddenException } from '@nestjs/common';
import { RoleName } from '../../generated/prisma/client.js';
import {
  assertAllowedRoleCombination,
  hasExactRoleSet,
} from '../roles/role-combination.policy';

export const USER_MANAGEMENT_ACTIONS = [
  'VIEW',
  'EDIT_PROFILE',
  'CHANGE_STATUS',
  'SOFT_DELETE',
  'RESTORE',
  'INITIATE_PASSWORD_RESET',
  'REVOKE_SESSIONS',
] as const;

export type UserManagementAction = (typeof USER_MANAGEMENT_ACTIONS)[number];

const DESTRUCTIVE_ACTIONS = new Set<UserManagementAction>([
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
  let actorRole: typeof RoleName.ADMIN | typeof RoleName.DEVELOPER | null;

  try {
    actorRole = getManagementActorRole(actorRoles);
    assertAllowedRoleCombination(targetRoles);
  } catch {
    return false;
  }

  if (!actorRole) {
    return false;
  }
  if (DESTRUCTIVE_ACTIONS.has(action) && actorId === targetId) {
    return false;
  }

  if (
    actorRole === RoleName.ADMIN &&
    DESTRUCTIVE_ACTIONS.has(action) &&
    (targetRoles.includes(RoleName.ADMIN) ||
      targetRoles.includes(RoleName.DEVELOPER))
  ) {
    return false;
  }

  return true;
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
