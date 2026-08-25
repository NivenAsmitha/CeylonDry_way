import { z } from "zod";
import { ROLE_NAMES, USER_STATUSES } from "../types/auth.types";

export const currentUserResponseSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  language: z.string(),
  status: z.enum(USER_STATUSES),
  roles: z.array(z.enum(ROLE_NAMES)),
  createdAt: z.string(),
});

export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  user: currentUserResponseSchema,
});
