import type { RoleName } from "../features/auth/types/auth.types";

const roleLabels: Readonly<Record<RoleName, string>> = {
  CLIENT: "Client",
  OWNER: "Owner",
  REVIEWER: "Reviewer",
  ADMIN: "Administrator",
  DEVELOPER: "Developer",
};

export function getRoleLabel(role: RoleName): string {
  return roleLabels[role];
}
