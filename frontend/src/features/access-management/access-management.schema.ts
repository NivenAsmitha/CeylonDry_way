import { z } from "zod";
import { PERMISSION_KEYS } from "../auth/types/auth.types";

const configurableRoleSchema = z.enum(["ADMIN", "REVIEWER"]);

export const accessManagementMatrixSchema = z.object({
  permissions: z.array(
    z.object({
      key: z.enum(PERMISSION_KEYS),
      name: z.string(),
      description: z.string(),
      availableTo: z.array(configurableRoleSchema),
    }),
  ),
  roles: z.array(
    z.object({
      role: configurableRoleSchema,
      permissions: z.array(z.enum(PERMISSION_KEYS)),
    }),
  ),
  developer: z.object({
    role: z.literal("DEVELOPER"),
    permissions: z.array(z.enum(PERMISSION_KEYS)),
    editable: z.literal(false),
  }),
});
