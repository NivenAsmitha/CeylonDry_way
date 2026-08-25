import type { RoleName, UserStatus } from "../../auth/types/auth.types";

export const USER_MANAGEMENT_ACTIONS = [
  "VIEW",
  "EDIT_PROFILE",
  "CHANGE_STATUS",
  "SOFT_DELETE",
  "RESTORE",
  "INITIATE_PASSWORD_RESET",
  "REVOKE_SESSIONS",
] as const;

export type UserManagementAction = (typeof USER_MANAGEMENT_ACTIONS)[number];

export const USER_SORT_VALUES = [
  "created_desc",
  "created_asc",
  "name_asc",
  "name_desc",
  "email_asc",
  "status_asc",
] as const;

export type UserSort = (typeof USER_SORT_VALUES)[number];

export interface ManagedUserSummary {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  language: string;
  status: UserStatus;
  statusChangedAt: string;
  roles: RoleName[];
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  isDeleted: boolean;
  allowedActions: UserManagementAction[];
}

export interface ManagedUserDetails extends ManagedUserSummary {
  activity: {
    activeSessionCount: number;
    propertiesOwned: number;
    reviewDecisions: number;
  };
  roleHistory: Array<{
    role: RoleName;
    assignedAt: string;
    assignedByName: string | null;
    systemReason: string | null;
  }>;
  auditHistory: Array<{
    id: string;
    action: string;
    actorName: string;
    before: Record<string, unknown> | null;
    after: Record<string, unknown> | null;
    createdAt: string;
  }>;
}

export interface UserListQuery {
  search?: string;
  role?: RoleName;
  status?: UserStatus;
  includeDeleted: boolean;
  page: number;
  pageSize: number;
  sort: UserSort;
}

export interface UserListResponse {
  items: ManagedUserSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface ManagedProfileInput {
  name?: string;
  phone?: string | null;
  language?: string;
}
