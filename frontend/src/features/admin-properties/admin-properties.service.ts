import { z } from "zod";
import { apiClient } from "../../services/api";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type PropertyStatus,
} from "../properties/types/property.types";

export const ADMIN_PROPERTY_ACTIONS = ["SUSPEND", "REACTIVATE", "ARCHIVE"] as const;
export type AdminPropertyAction = (typeof ADMIN_PROPERTY_ACTIONS)[number];

const responseSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      lifecycleStatus: z.enum(PROPERTY_STATUSES),
      createdAt: z.string(),
      updatedAt: z.string(),
      owner: z.object({ id: z.uuid(), name: z.string(), email: z.string() }),
      activeVersion: z
        .object({
          id: z.uuid(),
          name: z.string().nullable(),
          propertyType: z.enum(PROPERTY_TYPES).nullable(),
          city: z.string().nullable(),
          district: z.string().nullable(),
          photoCount: z.number().int().nonnegative(),
        })
        .nullable(),
      allowedActions: z.array(z.enum(ADMIN_PROPERTY_ACTIONS)),
    }),
  ),
  total: z.number().int().nonnegative(),
  limited: z.boolean(),
});

export type AdminPropertyList = z.infer<typeof responseSchema>;

export async function listAdminProperties(
  query: { search?: string; status?: PropertyStatus },
  signal?: AbortSignal,
): Promise<AdminPropertyList> {
  const response = await apiClient.get<unknown>("/admin/properties", {
    params: query,
    signal,
  });
  return responseSchema.parse(response.data);
}

export async function applyAdminPropertyAction(
  propertyId: string,
  action: AdminPropertyAction,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/admin/properties/${propertyId}/action`, {
    action,
    reason,
  });
}
