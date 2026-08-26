import type { RoleName } from "../auth/types/auth.types";

export type ManagementScope = "admin" | "developer";

export const ADMIN_MANAGEABLE_ROLE_FILTERS: readonly RoleName[] = [
  "CLIENT",
  "OWNER",
  "REVIEWER",
];

const validRoleSets = new Set([
  "CLIENT",
  "CLIENT+OWNER",
  "REVIEWER",
  "ADMIN",
  "DEVELOPER",
]);

function roleSetSignature(roles: readonly RoleName[]): string {
  return [...new Set(roles)].sort().join("+");
}

export function isTargetVisibleToScope(
  scope: ManagementScope,
  roles: readonly RoleName[],
): boolean {
  const signature = roleSetSignature(roles);
  if (!validRoleSets.has(signature)) return false;
  if (scope === "developer") return true;

  return (
    signature === "CLIENT" ||
    signature === "CLIENT+OWNER" ||
    signature === "REVIEWER"
  );
}
