import { useQuery } from "@tanstack/react-query";
import { getAccessMatrix } from "./access-management.service";

export const ACCESS_MANAGEMENT_QUERY_KEY = [
  "private",
  "developer",
  "access-management",
] as const;

export function useAccessManagement() {
  return useQuery({
    queryKey: ACCESS_MANAGEMENT_QUERY_KEY,
    queryFn: ({ signal }) => getAccessMatrix(signal),
  });
}
