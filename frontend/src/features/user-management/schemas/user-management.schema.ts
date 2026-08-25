import { z } from "zod";
import { ROLE_NAMES, USER_STATUSES } from "../../auth/types/auth.types";
import { USER_MANAGEMENT_ACTIONS } from "../types/user-management.types";

const managedUserSummarySchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  phone: z.string().nullable(),
  language: z.string(),
  status: z.enum(USER_STATUSES),
  statusChangedAt: z.string(),
  roles: z.array(z.enum(ROLE_NAMES)),
  createdAt: z.string(),
  updatedAt: z.string(),
  deletedAt: z.string().nullable(),
  isDeleted: z.boolean(),
  allowedActions: z.array(z.enum(USER_MANAGEMENT_ACTIONS)),
});

export const userListResponseSchema = z.object({
  items: z.array(managedUserSummarySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    totalItems: z.number().int().nonnegative(),
    totalPages: z.number().int().positive(),
  }),
});

export const managedUserDetailsSchema = managedUserSummarySchema.extend({
  activity: z.object({
    activeSessionCount: z.number().int().nonnegative(),
    propertiesOwned: z.number().int().nonnegative(),
    reviewDecisions: z.number().int().nonnegative(),
  }),
  roleHistory: z.array(
    z.object({
      role: z.enum(ROLE_NAMES),
      assignedAt: z.string(),
      assignedByName: z.string().nullable(),
      systemReason: z.string().nullable(),
    }),
  ),
  auditHistory: z.array(
    z.object({
      id: z.string().uuid(),
      action: z.string(),
      actorName: z.string(),
      before: z.record(z.string(), z.unknown()).nullable(),
      after: z.record(z.string(), z.unknown()).nullable(),
      createdAt: z.string(),
    }),
  ),
});
