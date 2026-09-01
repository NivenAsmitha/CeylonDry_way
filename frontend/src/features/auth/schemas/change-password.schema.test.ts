import { describe, expect, it } from "vitest";
import { changePasswordSchema } from "./change-password.schema";

describe("changePasswordSchema", () => {
  it("accepts a matching, different password of at least 12 characters", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "CurrentPassword123!",
        newPassword: "NewPassword456!",
        confirmPassword: "NewPassword456!",
      }).success,
    ).toBe(true);
  });

  it("rejects mismatched, short, or unchanged passwords", () => {
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "CurrentPassword123!",
        newPassword: "short",
        confirmPassword: "different",
      }).success,
    ).toBe(false);
    expect(
      changePasswordSchema.safeParse({
        currentPassword: "CurrentPassword123!",
        newPassword: "CurrentPassword123!",
        confirmPassword: "CurrentPassword123!",
      }).success,
    ).toBe(false);
  });
});
