import { RoleName } from '../../generated/prisma/client.js';

const ROLE_ORDER: readonly RoleName[] = [
  RoleName.CLIENT,
  RoleName.OWNER,
  RoleName.REVIEWER,
  RoleName.ADMIN,
  RoleName.DEVELOPER,
];

export const ALLOWED_ROLE_COMBINATIONS: readonly (readonly RoleName[])[] = [
  [RoleName.CLIENT],
  [RoleName.CLIENT, RoleName.OWNER],
  [RoleName.REVIEWER],
  [RoleName.ADMIN],
  [RoleName.DEVELOPER],
] as const;

const allowedSignatures = new Set(
  ALLOWED_ROLE_COMBINATIONS.map((roles) => roleSetSignature(roles)),
);

export class RoleCombinationPolicyError extends Error {
  constructor() {
    super('Account role combination is not permitted');
    this.name = 'RoleCombinationPolicyError';
  }
}

export function normalizeRoleSet(roles: readonly RoleName[]): RoleName[] {
  const uniqueRoles = new Set(roles);
  return ROLE_ORDER.filter((role) => uniqueRoles.has(role));
}

export function roleSetSignature(roles: readonly RoleName[]): string {
  return normalizeRoleSet(roles).join('+');
}

export function isAllowedRoleCombination(roles: readonly RoleName[]): boolean {
  return allowedSignatures.has(roleSetSignature(roles));
}

export function assertAllowedRoleCombination(roles: readonly RoleName[]): void {
  if (!isAllowedRoleCombination(roles)) {
    throw new RoleCombinationPolicyError();
  }
}

export function hasExactRoleSet(
  roles: readonly RoleName[],
  expected: readonly RoleName[],
): boolean {
  return roleSetSignature(roles) === roleSetSignature(expected);
}
