import { z } from "zod";

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(128, "Use no more than 128 characters"),
    confirmPassword: z.string().min(1, "Confirm the new password"),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormInput = z.infer<typeof resetPasswordSchema>;
