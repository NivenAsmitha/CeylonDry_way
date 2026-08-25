import { useQuery } from "@tanstack/react-query";
import { PRIVATE_QUERY_KEY } from "../../../services/queryClient";
import * as usersService from "../services/user-management.service";
import type { UserListQuery } from "../types/user-management.types";

export const USER_MANAGEMENT_QUERY_KEY = [
  ...PRIVATE_QUERY_KEY,
  "user-management",
] as const;

export function useManagedUsers(query: UserListQuery) {
  return useQuery({
    queryKey: [...USER_MANAGEMENT_QUERY_KEY, "list", query],
    queryFn: ({ signal }) => usersService.listUsers(query, signal),
  });
}

export function useManagedUser(userId: string) {
  return useQuery({
    queryKey: [...USER_MANAGEMENT_QUERY_KEY, "detail", userId],
    queryFn: ({ signal }) => usersService.getUser(userId, signal),
    enabled: Boolean(userId),
  });
}
