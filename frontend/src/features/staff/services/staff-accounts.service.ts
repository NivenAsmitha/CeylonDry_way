import { currentUserResponseSchema } from "../../auth/schemas/auth-response.schema";
import { apiClient } from "../../../services/api";
import type {
  CreateStaffAccountInput,
  CreatedStaffAccount,
} from "../types/staff-account.types";

async function createStaffAccount(
  path: string,
  input: CreateStaffAccountInput,
): Promise<CreatedStaffAccount> {
  const response = await apiClient.post<unknown>(path, input);
  return currentUserResponseSchema.parse(response.data);
}

export function createReviewer(
  input: CreateStaffAccountInput,
): Promise<CreatedStaffAccount> {
  return createStaffAccount("/admin/reviewers", input);
}

export function createAdmin(
  input: CreateStaffAccountInput,
): Promise<CreatedStaffAccount> {
  return createStaffAccount("/developer/admins", input);
}
