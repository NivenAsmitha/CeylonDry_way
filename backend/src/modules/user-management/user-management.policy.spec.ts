import { RoleName } from '../../generated/prisma/client.js';
import {
  canManageUser,
  getAllowedUserManagementActions,
  getManagementActorRole,
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

  it('allows Admin safe operations on Developer but not authority-changing state actions', () => {
    for (const action of [
      'VIEW',
      'EDIT_PROFILE',
      'INITIATE_PASSWORD_RESET',
      'REVOKE_SESSIONS',
    ] as const) {
      expect(
        canManageUser(
          'admin',
          [RoleName.ADMIN],
          'developer',
          [RoleName.DEVELOPER],
          action,
        ),
      ).toBe(true);
    }

    for (const action of ['CHANGE_STATUS', 'SOFT_DELETE', 'RESTORE'] as const) {
      expect(
        canManageUser(
          'admin',
          [RoleName.ADMIN],
          'developer',
          [RoleName.DEVELOPER],
          action,
        ),
      ).toBe(false);
    }
  });

  it('reserves Admin state management for Developer while Admin manages client and reviewer states', () => {
    expect(
      canManageUser(
        'admin',
        [RoleName.ADMIN],
        'other-admin',
        [RoleName.ADMIN],
        'CHANGE_STATUS',
      ),
    ).toBe(false);
    expect(
      canManageUser(
        'developer',
        [RoleName.DEVELOPER],
        'admin',
        [RoleName.ADMIN],
        'CHANGE_STATUS',
      ),
    ).toBe(true);
    expect(
      canManageUser(
        'admin',
        [RoleName.ADMIN],
        'owner',
        [RoleName.CLIENT, RoleName.OWNER],
        'SOFT_DELETE',
      ),
    ).toBe(true);
    expect(
      canManageUser(
        'admin',
        [RoleName.ADMIN],
        'reviewer',
        [RoleName.REVIEWER],
        'RESTORE',
      ),
    ).toBe(true);
  });

  it('blocks privileged self-deactivation and deletion for both actor roles', () => {
    for (const role of [RoleName.ADMIN, RoleName.DEVELOPER]) {
      for (const action of [
        'CHANGE_STATUS',
        'SOFT_DELETE',
        'RESTORE',
      ] as const) {
        expect(canManageUser('self', [role], 'self', [role], action)).toBe(
          false,
        );
      }
    }
  });

  it('returns only actions allowed for the actor and target', () => {
    expect(
      getAllowedUserManagementActions('admin', [RoleName.ADMIN], 'developer', [
        RoleName.DEVELOPER,
      ]),
    ).toEqual([
      'VIEW',
      'EDIT_PROFILE',
      'INITIATE_PASSWORD_RESET',
      'REVOKE_SESSIONS',
    ]);
  });
});
