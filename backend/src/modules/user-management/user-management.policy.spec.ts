import { RoleName } from '../../generated/prisma/client.js';
import {
  canManageUser,
  getAllowedUserManagementActions,
  getManagementActorRole,
  getUserManagementDenialCategory,
  USER_MANAGEMENT_ACTIONS,
} from './user-management.policy';

describe('user-management hierarchy policy', () => {
  it('recognizes only exact Admin and Developer actor role sets', () => {
    expect(getManagementActorRole([RoleName.ADMIN])).toBe(RoleName.ADMIN);
    expect(getManagementActorRole([RoleName.DEVELOPER])).toBe(
      RoleName.DEVELOPER,
    );
    expect(getManagementActorRole([RoleName.CLIENT])).toBeNull();
    expect(() =>
      getManagementActorRole([RoleName.CLIENT, RoleName.ADMIN]),
    ).toThrow('Account role combination is not permitted');
  });

  it.each([
    [[RoleName.CLIENT]],
    [[RoleName.CLIENT, RoleName.OWNER]],
    [[RoleName.REVIEWER]],
  ])('allows Admin every management action on the valid %j target', (roles) => {
    for (const action of USER_MANAGEMENT_ACTIONS) {
      expect(
        canManageUser('admin', [RoleName.ADMIN], 'target', roles, action),
      ).toBe(true);
    }
  });

  it.each([[[RoleName.ADMIN]], [[RoleName.DEVELOPER]]])(
    'denies Admin every operation on the %j target',
    (roles) => {
      for (const action of USER_MANAGEMENT_ACTIONS) {
        expect(
          canManageUser('admin', [RoleName.ADMIN], 'target', roles, action),
        ).toBe(false);
        expect(
          getUserManagementDenialCategory(
            'admin',
            [RoleName.ADMIN],
            'target',
            roles,
            action,
          ),
        ).toBe('ADMIN_TARGET_OUTSIDE_AUTHORITY');
      }
    },
  );

  it('denies every Admin management action on their own account', () => {
    for (const action of USER_MANAGEMENT_ACTIONS) {
      expect(
        canManageUser(
          'admin',
          [RoleName.ADMIN],
          'admin',
          [RoleName.ADMIN],
          action,
        ),
      ).toBe(false);
    }
  });

  it.each([
    [[RoleName.CLIENT]],
    [[RoleName.CLIENT, RoleName.OWNER]],
    [[RoleName.REVIEWER]],
    [[RoleName.ADMIN]],
    [[RoleName.DEVELOPER]],
  ])('allows Developer to manage another valid %j target', (roles) => {
    for (const action of USER_MANAGEMENT_ACTIONS) {
      expect(
        canManageUser(
          'developer',
          [RoleName.DEVELOPER],
          'target',
          roles,
          action,
        ),
      ).toBe(true);
    }
  });

  it('blocks Developer self role, status, deletion, and restore operations', () => {
    for (const action of [
      'CHANGE_ROLES',
      'CHANGE_STATUS',
      'SOFT_DELETE',
      'RESTORE',
    ] as const) {
      expect(
        canManageUser(
          'developer',
          [RoleName.DEVELOPER],
          'developer',
          [RoleName.DEVELOPER],
          action,
        ),
      ).toBe(false);
    }
  });

  it.each([
    [[]],
    [[RoleName.CLIENT, RoleName.REVIEWER]],
    [[RoleName.ADMIN, RoleName.DEVELOPER]],
  ])('denies invalid or ambiguous target roles %j', (roles) => {
    expect(
      canManageUser('developer', [RoleName.DEVELOPER], 'target', roles, 'VIEW'),
    ).toBe(false);
    expect(
      getUserManagementDenialCategory(
        'developer',
        [RoleName.DEVELOPER],
        'target',
        roles,
        'VIEW',
      ),
    ).toBe('INVALID_TARGET_ROLE_SET');
  });

  it('derives no Admin capabilities for Admin or Developer targets', () => {
    expect(
      getAllowedUserManagementActions('admin', [RoleName.ADMIN], 'other', [
        RoleName.ADMIN,
      ]),
    ).toEqual([]);
    expect(
      getAllowedUserManagementActions('admin', [RoleName.ADMIN], 'developer', [
        RoleName.DEVELOPER,
      ]),
    ).toEqual([]);
  });
});
