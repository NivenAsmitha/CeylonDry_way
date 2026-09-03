import { z } from "zod";
import {
  PERMISSION_KEYS,
  ROLE_NAMES,
  USER_STATUSES,
} from "../types/auth.types";

export const currentUserResponseSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  language: z.string(),
  status: z.enum(USER_STATUSES),
  roles: z.array(z.enum(ROLE_NAMES)),
  permissions: z.array(z.enum(PERMISSION_KEYS)),
  createdAt: z.string(),
});

export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: currentUserResponseSchema,
});
