import { z } from "zod";
import { apiClient } from "../../services/api";
import { PROPERTY_STATUSES } from "../properties/types/property.types";
import { PROPERTY_REPORT_STATUSES } from "../reports/reports.service";

const healthSchema = z.object({
  status: z.literal("operational"),
  service: z.string(),
  checkedAt: z.string(),
  serviceStartedAt: z.string(),
  uptimeSeconds: z.number().int().nonnegative(),
  runtime: z.object({ node: z.string() }),
  database: z.object({
    status: z.literal("connected"),
    latencyMs: z.number().int().nonnegative(),
  }),
  metrics: z.object({
    users: z.object({
      total: z.number().int().nonnegative(),
      active: z.number().int().nonnegative(),
    }),
    activeSessions: z.number().int().nonnegative(),
    properties: z.object({
      total: z.number().int().nonnegative(),
      byStatus: z.object(
        Object.fromEntries(
          PROPERTY_STATUSES.map((status) => [
            status,
            z.number().int().nonnegative(),
          ]),
        ) as Record<(typeof PROPERTY_STATUSES)[number], z.ZodNumber>,
      ),
    }),
    reports: z.object({
      byStatus: z.object(
        Object.fromEntries(
          PROPERTY_REPORT_STATUSES.map((status) => [
            status,
            z.number().int().nonnegative(),
          ]),
        ) as Record<(typeof PROPERTY_REPORT_STATUSES)[number], z.ZodNumber>,
      ),
    }),
    auditEventsLast24Hours: z.number().int().nonnegative(),
  }),
});

const auditListSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      action: z.string(),
      targetType: z.string(),
      targetId: z.string(),
      beforeSummary: z.unknown().nullable(),
      afterSummary: z.unknown().nullable(),
      createdAt: z.string(),
      actor: z.object({ id: z.uuid(), name: z.string(), email: z.string() }),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type DeveloperHealth = z.infer<typeof healthSchema>;
export type AuditLogList = z.infer<typeof auditListSchema>;

export async function getDeveloperHealth(
  signal?: AbortSignal,
): Promise<DeveloperHealth> {
  const response = await apiClient.get<unknown>(
    "/developer/operations/health",
    { signal },
  );
  return healthSchema.parse(response.data);
}

export async function listAuditLogs(
  query: {
    search?: string;
    action?: string;
    targetType?: string;
    page?: number;
  },
  signal?: AbortSignal,
): Promise<AuditLogList> {
  const response = await apiClient.get<unknown>(
    "/developer/operations/audit-logs",
    { params: query, signal },
  );
  return auditListSchema.parse(response.data);
}
