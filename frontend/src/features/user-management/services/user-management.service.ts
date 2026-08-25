import { apiClient } from "../../../services/api";
import {
  managedUserDetailsSchema,
  userListResponseSchema,
} from "../schemas/user-management.schema";
import type {
  ManagedProfileInput,
  ManagedUserDetails,
  UserListQuery,
  UserListResponse,
} from "../types/user-management.types";

function toParams(query: UserListQuery): URLSearchParams {
  const params = new URLSearchParams({
    includeDeleted: String(query.includeDeleted),
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
  });
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.role) params.set("role", query.role);
  if (query.status) params.set("status", query.status);
  return params;
}

export async function listUsers(
  query: UserListQuery,
  signal?: AbortSignal,
): Promise<UserListResponse> {
  const response = await apiClient.get<unknown>("/management/users", {
    params: toParams(query),
    signal,
  });
  return userListResponseSchema.parse(response.data);
}

export async function getUser(
  userId: string,
  signal?: AbortSignal,
): Promise<ManagedUserDetails> {
  const response = await apiClient.get<unknown>(`/management/users/${userId}`, {
    signal,
  });
  return managedUserDetailsSchema.parse(response.data);
}

export async function updateUser(
  userId: string,
  input: ManagedProfileInput,
): Promise<ManagedUserDetails> {
  const response = await apiClient.patch<unknown>(
    `/management/users/${userId}`,
    input,
  );
  return managedUserDetailsSchema.parse(response.data);
}

export async function changeStatus(
  userId: string,
  status: "SUSPENDED" | "DISABLED",
  reason: string,
): Promise<ManagedUserDetails> {
  const response = await apiClient.patch<unknown>(
    `/management/users/${userId}/status`,
    { status, reason },
  );
  return managedUserDetailsSchema.parse(response.data);
}

export async function restoreUser(
  userId: string,
  reason: string,
): Promise<ManagedUserDetails> {
  const response = await apiClient.post<unknown>(
    `/management/users/${userId}/restore`,
    { reason },
  );
  return managedUserDetailsSchema.parse(response.data);
}

export async function softDeleteUser(
  userId: string,
  reason: string,
): Promise<ManagedUserDetails> {
  const response = await apiClient.delete<unknown>(
    `/management/users/${userId}`,
    { data: { reason } },
  );
  return managedUserDetailsSchema.parse(response.data);
}

export async function initiatePasswordReset(
  userId: string,
  reason: string,
): Promise<{ accepted: true; message: string }> {
  const response = await apiClient.post<{ accepted: true; message: string }>(
    `/management/users/${userId}/password-reset`,
    { reason },
  );
  return response.data;
}

export async function revokeSessions(
  userId: string,
  reason: string,
): Promise<{ revokedSessionCount: number }> {
  const response = await apiClient.post<{ revokedSessionCount: number }>(
    `/management/users/${userId}/revoke-sessions`,
    { reason },
  );
  return response.data;
}
