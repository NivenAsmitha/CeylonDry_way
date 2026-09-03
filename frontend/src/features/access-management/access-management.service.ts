import { apiClient } from "../../services/api";
import { accessManagementMatrixSchema } from "./access-management.schema";
import type {
  AccessManagementMatrix,
  ConfigurableAccessRole,
} from "./access-management.types";
import type { PermissionKey } from "../auth/types/auth.types";

export async function getAccessMatrix(
  signal?: AbortSignal,
): Promise<AccessManagementMatrix> {
  const response = await apiClient.get<unknown>(
    "/developer/access-management",
    { signal },
  );
  return accessManagementMatrixSchema.parse(response.data);
}

export async function updateRolePermissions(
  role: ConfigurableAccessRole,
  permissions: PermissionKey[],
  reason: string,
): Promise<AccessManagementMatrix> {
  const response = await apiClient.patch<unknown>(
    `/developer/access-management/${role}`,
    { permissions, reason },
  );
  return accessManagementMatrixSchema.parse(response.data);
}
