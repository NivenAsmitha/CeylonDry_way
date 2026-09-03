import type {
  PermissionKey,
  RoleName,
} from "../auth/types/auth.types";

export type ConfigurableAccessRole = Extract<RoleName, "ADMIN" | "REVIEWER">;

export interface PermissionDefinition {
  key: PermissionKey;
  name: string;
  description: string;
  availableTo: ConfigurableAccessRole[];
}

export interface RoleAccess {
  role: ConfigurableAccessRole;
  permissions: PermissionKey[];
}

export interface AccessManagementMatrix {
  permissions: PermissionDefinition[];
  roles: RoleAccess[];
  developer: {
    role: "DEVELOPER";
    permissions: PermissionKey[];
    editable: false;
  };
}
