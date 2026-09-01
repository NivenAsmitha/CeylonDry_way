import { describe, expect, it } from "vitest";
import { getRoleLandingPath, getSafeRedirectPath } from "./navigation";

describe("navigation destinations", () => {
  it("routes public account roles to the home page", () => {
    expect(getRoleLandingPath(["CLIENT"])).toBe("/");
    expect(getRoleLandingPath(["CLIENT", "OWNER"])).toBe("/");
  });

  it("routes staff to their own workspace", () => {
    expect(getRoleLandingPath(["REVIEWER"])).toBe("/reviewer");
    expect(getRoleLandingPath(["ADMIN"])).toBe("/admin/reports");
    expect(getRoleLandingPath(["DEVELOPER"])).toBe("/developer/operations");
  });

  it("preserves a safe protected-route destination", () => {
    expect(
      getSafeRedirectPath({ from: "/owner/properties" }, "/developer/users"),
    ).toBe("/owner/properties");
  });
});
