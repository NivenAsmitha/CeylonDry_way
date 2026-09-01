import { z } from "zod";
import { apiClient } from "../../services/api";
import { PROPERTY_STATUSES } from "../properties/types/property.types";

export const PROPERTY_REPORT_CATEGORIES = [
  "INCORRECT_DETAILS",
  "CLOSED_OR_MISSING",
  "ACCESSIBILITY_ISSUE",
  "SAFETY_OR_CLEANLINESS",
  "DUPLICATE",
  "INAPPROPRIATE_CONTENT",
  "OTHER",
] as const;
export const PROPERTY_REPORT_STATUSES = [
  "OPEN",
  "IN_REVIEW",
  "RESOLVED",
  "DISMISSED",
] as const;
export const REPORT_MODERATION_ACTIONS = [
  "START_REVIEW",
  "RESOLVE",
  "DISMISS",
] as const;

export type PropertyReportCategory =
  (typeof PROPERTY_REPORT_CATEGORIES)[number];
export type PropertyReportStatus = (typeof PROPERTY_REPORT_STATUSES)[number];
export type ReportModerationAction = (typeof REPORT_MODERATION_ACTIONS)[number];

export const propertyReportCategoryLabels: Record<
  PropertyReportCategory,
  string
> = {
  INCORRECT_DETAILS: "Incorrect place details",
  CLOSED_OR_MISSING: "Closed or no longer exists",
  ACCESSIBILITY_ISSUE: "Accessibility information is wrong",
  SAFETY_OR_CLEANLINESS: "Safety or cleanliness concern",
  DUPLICATE: "Duplicate place",
  INAPPROPRIATE_CONTENT: "Inappropriate content or photo",
  OTHER: "Another problem",
};

const createdReportSchema = z.object({
  id: z.uuid(),
  status: z.enum(PROPERTY_REPORT_STATUSES),
  createdAt: z.string(),
  message: z.string(),
});

const adminReportListSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      category: z.enum(PROPERTY_REPORT_CATEGORIES),
      description: z.string(),
      reporterEmail: z.string().nullable(),
      status: z.enum(PROPERTY_REPORT_STATUSES),
      moderatorNote: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
      property: z.object({
        id: z.uuid(),
        lifecycleStatus: z.enum(PROPERTY_STATUSES),
        owner: z.object({ id: z.uuid(), name: z.string(), email: z.string() }),
      }),
      propertyVersion: z.object({
        id: z.uuid(),
        name: z.string().nullable(),
        city: z.string().nullable(),
        district: z.string().nullable(),
      }),
      moderator: z.object({ id: z.uuid(), name: z.string() }).nullable(),
      allowedActions: z.array(z.enum(REPORT_MODERATION_ACTIONS)),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  summary: z.object({
    OPEN: z.number().int().nonnegative(),
    IN_REVIEW: z.number().int().nonnegative(),
    RESOLVED: z.number().int().nonnegative(),
    DISMISSED: z.number().int().nonnegative(),
  }),
});

export type AdminReportList = z.infer<typeof adminReportListSchema>;

export async function createPropertyReport(
  propertyId: string,
  input: {
    category: PropertyReportCategory;
    description: string;
    reporterEmail?: string;
  },
) {
  const response = await apiClient.post<unknown>(
    `/places/${propertyId}/reports`,
    input,
  );
  return createdReportSchema.parse(response.data);
}

export async function listAdminReports(
  query: {
    search?: string;
    status?: PropertyReportStatus;
    category?: PropertyReportCategory;
    page?: number;
  },
  signal?: AbortSignal,
): Promise<AdminReportList> {
  const response = await apiClient.get<unknown>("/admin/reports", {
    params: query,
    signal,
  });
  return adminReportListSchema.parse(response.data);
}

export async function moderatePropertyReport(
  reportId: string,
  action: ReportModerationAction,
  note?: string,
): Promise<void> {
  await apiClient.patch(`/admin/reports/${reportId}/moderation`, {
    action,
    note,
  });
}
