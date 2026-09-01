import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PropertyStatus } from "../properties/types/property.types";
import {
  applyAdminPropertyAction,
  listAdminProperties,
  type AdminPropertyAction,
} from "./admin-properties.service";

const ADMIN_PROPERTIES_KEY = ["private", "admin-properties"] as const;

export function useAdminProperties(query: {
  search?: string;
  status?: PropertyStatus;
}) {
  return useQuery({
    queryKey: [...ADMIN_PROPERTIES_KEY, query],
    queryFn: ({ signal }) => listAdminProperties(query, signal),
  });
}

export function useAdminPropertyAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      propertyId,
      action,
      reason,
    }: {
      propertyId: string;
      action: AdminPropertyAction;
      reason: string;
    }) => applyAdminPropertyAction(propertyId, action, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ADMIN_PROPERTIES_KEY }),
  });
}
