import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPropertyReport,
  listAdminReports,
  moderatePropertyReport,
  type PropertyReportCategory,
  type PropertyReportStatus,
  type ReportModerationAction,
} from "./reports.service";

const ADMIN_REPORTS_KEY = ["private", "admin-reports"] as const;

export function useCreatePropertyReport(propertyId: string) {
  return useMutation({
    mutationFn: (input: {
      category: PropertyReportCategory;
      description: string;
      reporterEmail?: string;
    }) => createPropertyReport(propertyId, input),
  });
}

export function useAdminReports(query: {
  search?: string;
  status?: PropertyReportStatus;
  category?: PropertyReportCategory;
  page?: number;
}) {
  return useQuery({
    queryKey: [...ADMIN_REPORTS_KEY, query],
    queryFn: ({ signal }) => listAdminReports(query, signal),
  });
}

export function useModeratePropertyReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      action,
      note,
    }: {
      reportId: string;
      action: ReportModerationAction;
      note?: string;
    }) => moderatePropertyReport(reportId, action, note),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_REPORTS_KEY }),
  });
}
