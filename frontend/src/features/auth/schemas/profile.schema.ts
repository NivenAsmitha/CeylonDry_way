import { z } from "zod";
import { SUPPORTED_LANGUAGES } from "../types/auth.types";

export const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name must be 100 characters or fewer."),
  phone: z.string().trim().max(30, "Phone must be 30 characters or fewer."),
  language: z.enum(SUPPORTED_LANGUAGES),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
