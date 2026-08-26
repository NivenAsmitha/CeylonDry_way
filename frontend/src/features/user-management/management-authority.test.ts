import { describe, expect, it } from "vitest";
import type { RoleName } from "../auth/types/auth.types";
import {
  ADMIN_MANAGEABLE_ROLE_FILTERS,
  isTargetVisibleToScope,
} from "./management-authority";

describe("management UI authority", () => {
  it.each([[["CLIENT"]], [["CLIENT", "OWNER"]], [["REVIEWER"]]] as const)(
    "shows the valid Admin target %j",
    (roles) => {
      expect(isTargetVisibleToScope("admin", roles)).toBe(true);
    },
  );

  it.each([
    [["ADMIN"]],
    [["DEVELOPER"]],
    [["CLIENT", "ADMIN"]],
    [[]],
  ] as ReadonlyArray<readonly [readonly RoleName[]]>)(
    "hides the restricted or invalid Admin target %j",
    (roles) => {
      expect(isTargetVisibleToScope("admin", roles)).toBe(false);
    },
  );

  it("does not offer Admin or Developer filters in the Admin workspace", () => {
    expect(ADMIN_MANAGEABLE_ROLE_FILTERS).toEqual([
      "CLIENT",
      "OWNER",
      "REVIEWER",
    ]);
  });

  it.each([
    [["CLIENT"]],
    [["CLIENT", "OWNER"]],
    [["REVIEWER"]],
    [["ADMIN"]],
    [["DEVELOPER"]],
  ] as const)("shows the valid Developer target %j", (roles) => {
    expect(isTargetVisibleToScope("developer", roles)).toBe(true);
  });
});
