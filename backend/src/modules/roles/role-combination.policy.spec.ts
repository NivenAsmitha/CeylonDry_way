import { RoleName } from '../../generated/prisma/client.js';
import {
  assertAllowedRoleCombination,
  hasExactRoleSet,
  isAllowedRoleCombination,
  normalizeRoleSet,
  RoleCombinationPolicyError,
} from './role-combination.policy';

describe('account role-combination policy', () => {
  it.each([
    [[RoleName.CLIENT]],
    [[RoleName.CLIENT, RoleName.OWNER]],
    [[RoleName.OWNER, RoleName.CLIENT]],
    [[RoleName.REVIEWER]],
    [[RoleName.ADMIN]],
    [[RoleName.DEVELOPER]],
  ])('allows the authoritative role set %j', (roles) => {
    expect(isAllowedRoleCombination(roles)).toBe(true);
    expect(() => assertAllowedRoleCombination(roles)).not.toThrow();
  });

  it.each([
    [[]],
    [[RoleName.OWNER]],
    [[RoleName.CLIENT, RoleName.REVIEWER]],
    [[RoleName.CLIENT, RoleName.ADMIN]],
    [[RoleName.CLIENT, RoleName.DEVELOPER]],
    [[RoleName.OWNER, RoleName.REVIEWER]],
    [[RoleName.OWNER, RoleName.ADMIN]],
    [[RoleName.OWNER, RoleName.DEVELOPER]],
    [[RoleName.REVIEWER, RoleName.ADMIN]],
    [[RoleName.REVIEWER, RoleName.DEVELOPER]],
    [[RoleName.ADMIN, RoleName.DEVELOPER]],
  ])('rejects the role set %j', (roles) => {
    expect(isAllowedRoleCombination(roles)).toBe(false);
    expect(() => assertAllowedRoleCombination(roles)).toThrow(
      RoleCombinationPolicyError,
    );
  });

  it('normalizes roles and compares sets independent of database order', () => {
    expect(normalizeRoleSet([RoleName.OWNER, RoleName.CLIENT])).toEqual([
      RoleName.CLIENT,
      RoleName.OWNER,
    ]);
    expect(
      hasExactRoleSet(
        [RoleName.OWNER, RoleName.CLIENT],
        [RoleName.CLIENT, RoleName.OWNER],
      ),
    ).toBe(true);
  });
});
