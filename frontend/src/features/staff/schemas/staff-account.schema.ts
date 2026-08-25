import { z } from "zod";

export const staffAccountFormSchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    phone: z.string().trim().max(30),
    temporaryPassword: z
      .string()
      .min(16, "Use at least 16 characters.")
      .max(128)
      .regex(/[a-z]/, "Include a lowercase letter.")
      .regex(/[A-Z]/, "Include an uppercase letter.")
      .regex(/[0-9]/, "Include a number.")
      .regex(/[^A-Za-z0-9]/, "Include a symbol."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.temporaryPassword === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type StaffAccountFormValues = z.infer<typeof staffAccountFormSchema>;
