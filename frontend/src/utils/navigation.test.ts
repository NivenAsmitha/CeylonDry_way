import { describe, expect, it } from "vitest";
import { getRoleLandingPath, getSafeRedirectPath } from "./navigation";

describe("navigation destinations", () => {
  it("routes public account roles to the home page", () => {
    expect(getRoleLandingPath(["CLIENT"])).toBe("/");
    expect(getRoleLandingPath(["CLIENT", "OWNER"])).toBe("/");
  });

  it("routes staff to their own workspace", () => {
    expect(getRoleLandingPath(["REVIEWER"], ["LISTING_REVIEW"])).toBe(
      "/reviewer",
    );
    expect(getRoleLandingPath(["ADMIN"], ["REPORT_MANAGEMENT"])).toBe(
      "/admin/reports",
    );
    expect(getRoleLandingPath(["DEVELOPER"])).toBe("/developer/operations");
  });

  it("sends staff without operational permissions to their profile", () => {
    expect(getRoleLandingPath(["ADMIN"], [])).toBe("/profile");
    expect(getRoleLandingPath(["REVIEWER"], [])).toBe("/profile");
  });

  it("preserves a safe protected-route destination", () => {
    expect(
      getSafeRedirectPath({ from: "/owner/properties" }, "/developer/users"),
    ).toBe("/owner/properties");
  });
});
