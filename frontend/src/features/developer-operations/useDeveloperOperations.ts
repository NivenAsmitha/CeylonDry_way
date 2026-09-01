import { useQuery } from "@tanstack/react-query";
import {
  getDeveloperHealth,
  listAuditLogs,
} from "./developer-operations.service";

export function useDeveloperHealth() {
  return useQuery({
    queryKey: ["private", "developer-health"],
    queryFn: ({ signal }) => getDeveloperHealth(signal),
    refetchInterval: 60_000,
  });
}

export function useAuditLogs(query: {
  search?: string;
  action?: string;
  targetType?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["private", "developer-audit-logs", query],
    queryFn: ({ signal }) => listAuditLogs(query, signal),
  });
}
