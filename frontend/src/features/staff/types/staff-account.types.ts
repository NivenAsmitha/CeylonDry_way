import type { CurrentUser } from "../../auth/types/auth.types";

export interface CreateStaffAccountInput {
  name: string;
  email: string;
  phone?: string;
  temporaryPassword: string;
}

export type CreatedStaffAccount = CurrentUser;
