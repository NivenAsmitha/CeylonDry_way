/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ForbiddenException } from '@nestjs/common';
import { RoleName, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { PasswordResetDeliveryService } from '../password-reset/password-reset-delivery.service';
import { UserManagementService } from './user-management.service';

function participant(id: string, role: RoleName) {
  return {
    id,
    email: `${id}@example.test`,
    name: id,
    status: UserStatus.ACTIVE,
    deletedAt: null,
    roles: [{ role: { name: role } }],
  };
}

describe('UserManagementService security invariants', () => {
  function createFixture(
    actor = participant('actor', RoleName.ADMIN),
    target = participant('target', RoleName.CLIENT),
  ) {
    const transaction = {
      user: {
        findUnique: jest
          .fn()
          .mockImplementation(({ where }) =>
            Promise.resolve(where.id === actor.id ? actor : target),
          ),
        update: jest.fn().mockResolvedValue({ id: target.id }),
        findMany: jest
          .fn()
          .mockResolvedValue([
            { roles: [{ role: { name: RoleName.DEVELOPER } }] },
            { roles: [{ role: { name: RoleName.DEVELOPER } }] },
          ]),
      },
      refreshSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'reset-token-id' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-id' }) },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notification-id' }),
      },
      property: {
        updateMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      role: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'reviewer-role', name: RoleName.REVIEWER },
          ]),
      },
      userRole: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const transactionRunner = jest.fn(
      async (
        work:
          | ((client: typeof transaction) => Promise<unknown>)
          | Promise<unknown>[],
      ) => (Array.isArray(work) ? Promise.all(work) : work(transaction)),
    );
    const prisma = {
      $transaction: transactionRunner,
      user: {
        ...transaction.user,
        count: jest.fn().mockResolvedValue(0),
      },
      refreshSession: {
        ...transaction.refreshSession,
        count: jest.fn().mockResolvedValue(0),
      },
      passwordResetToken: transaction.passwordResetToken,
      auditLog: {
        ...transaction.auditLog,
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;
    const sendPasswordReset = jest.fn().mockResolvedValue(undefined);
    const delivery = {
      sendPasswordReset,
    } as unknown as PasswordResetDeliveryService;
    const service = new UserManagementService(prisma, delivery);

    return {
      service,
      prisma,
      transaction,
      transactionRunner,
      sendPasswordReset,
    };
  }

  it('prevents Admin from changing Developer status', async () => {
    const fixture = createFixture(
      participant('admin', RoleName.ADMIN),
      participant('developer', RoleName.DEVELOPER),
    );

    await expect(
      fixture.service.changeStatus('admin', 'developer', {
        status: UserStatus.SUSPENDED,
        reason: 'Security incident investigation',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fixture.transaction.user.update).not.toHaveBeenCalled();
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'admin',
        action: 'USER_MANAGEMENT_DENIED',
        targetType: 'User',
        targetId: 'developer',
        afterSummary: {
          attemptedAction: 'CHANGE_STATUS',
          denialCategory: 'ADMIN_TARGET_OUTSIDE_AUTHORITY',
        },
      },
    });
  });

  it.each([
    [RoleName.ADMIN, 'VIEW'],
    [RoleName.ADMIN, 'EDIT_PROFILE'],
    [RoleName.ADMIN, 'CHANGE_ROLES'],
    [RoleName.ADMIN, 'CHANGE_STATUS'],
    [RoleName.ADMIN, 'SOFT_DELETE'],
    [RoleName.ADMIN, 'RESTORE'],
    [RoleName.ADMIN, 'INITIATE_PASSWORD_RESET'],
    [RoleName.ADMIN, 'REVOKE_SESSIONS'],
    [RoleName.DEVELOPER, 'VIEW'],
    [RoleName.DEVELOPER, 'EDIT_PROFILE'],
    [RoleName.DEVELOPER, 'CHANGE_ROLES'],
    [RoleName.DEVELOPER, 'CHANGE_STATUS'],
    [RoleName.DEVELOPER, 'SOFT_DELETE'],
    [RoleName.DEVELOPER, 'RESTORE'],
    [RoleName.DEVELOPER, 'INITIATE_PASSWORD_RESET'],
    [RoleName.DEVELOPER, 'REVOKE_SESSIONS'],
  ] as const)(
    'denies Admin %s target operation %s before sensitive work',
    async (targetRole, action) => {
      const fixture = createFixture(
        participant('admin', RoleName.ADMIN),
        participant('restricted', targetRole),
      );

      const operation = (() => {
        switch (action) {
          case 'VIEW':
            return fixture.service.getUser('admin', 'restricted');
          case 'EDIT_PROFILE':
            return fixture.service.updateUser('admin', 'restricted', {
              name: 'Restricted account',
            });
          case 'CHANGE_ROLES':
            return fixture.service.changeRoles('admin', 'restricted', {
              roles: [RoleName.REVIEWER],
              reason: 'Policy verification',
            });
          case 'CHANGE_STATUS':
            return fixture.service.changeStatus('admin', 'restricted', {
              status: UserStatus.SUSPENDED,
              reason: 'Policy verification',
            });
          case 'SOFT_DELETE':
            return fixture.service.softDelete('admin', 'restricted', {
              reason: 'Policy verification',
            });
          case 'RESTORE':
            return fixture.service.restore('admin', 'restricted', {
              reason: 'Policy verification',
            });
          case 'INITIATE_PASSWORD_RESET':
            return fixture.service.initiatePasswordReset(
              'admin',
              'restricted',
              { reason: 'Policy verification' },
            );
          case 'REVOKE_SESSIONS':
            return fixture.service.revokeSessions('admin', 'restricted', {
              reason: 'Policy verification',
            });
        }
      })();

      await expect(operation).rejects.toBeInstanceOf(ForbiddenException);
      expect(fixture.transaction.user.update).not.toHaveBeenCalled();
      expect(
        fixture.transaction.refreshSession.updateMany,
      ).not.toHaveBeenCalled();
      expect(
        fixture.transaction.passwordResetToken.create,
      ).not.toHaveBeenCalled();
      expect(
        (fixture.prisma.refreshSession.count as jest.Mock).mock.calls,
      ).toHaveLength(0);
      expect(
        (fixture.prisma.auditLog.findMany as jest.Mock).mock.calls,
      ).toHaveLength(0);
      expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorId: 'admin',
          action: 'USER_MANAGEMENT_DENIED',
          targetId: 'restricted',
          afterSummary: {
            attemptedAction: action,
            denialCategory: 'ADMIN_TARGET_OUTSIDE_AUTHORITY',
          },
        }),
      });
    },
  );

  it('changes an eligible role set atomically, revokes sessions, and audits the reason', async () => {
    const fixture = createFixture(
      participant('admin', RoleName.ADMIN),
      participant('target', RoleName.CLIENT),
    );
    jest.spyOn(fixture.service, 'getUser').mockResolvedValue({} as never);

    await fixture.service.changeRoles('admin', 'target', {
      roles: [RoleName.REVIEWER],
      reason: 'Assign trained reviewer duties',
    });

    expect(fixture.transaction.userRole.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'target' },
    });
    expect(fixture.transaction.userRole.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'target',
          roleId: 'reviewer-role',
          assignedById: 'admin',
          systemReason: 'Assign trained reviewer duties',
        },
      ],
    });
    expect(fixture.transaction.refreshSession.updateMany).toHaveBeenCalled();
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin',
        action: 'USER_ROLES_CHANGED',
        targetId: 'target',
        beforeSummary: { roles: [RoleName.CLIENT] },
        afterSummary: expect.objectContaining({
          roles: [RoleName.REVIEWER],
          reason: 'Assign trained reviewer duties',
        }),
      }),
    });
  });

  it('applies Admin list authority before role filters and search', async () => {
    const fixture = createFixture();
    fixture.transaction.user.findMany.mockResolvedValue([]);

    await fixture.service.listUsers('actor', {
      page: 1,
      pageSize: 20,
      sort: 'created_desc',
      includeDeleted: false,
      role: RoleName.DEVELOPER,
      search: 'staff',
    });

    const listCall = fixture.transaction.user.findMany.mock.calls[0][0] as {
      where: { AND: unknown[] };
    };
    const authorityFilter = JSON.stringify(listCall.where.AND[0]);
    expect(authorityFilter).toContain(RoleName.CLIENT);
    expect(authorityFilter).toContain(RoleName.OWNER);
    expect(authorityFilter).toContain(RoleName.REVIEWER);
    expect(authorityFilter).not.toContain(RoleName.ADMIN);
    expect(authorityFilter).not.toContain(RoleName.DEVELOPER);
  });

  it('denies and categorizes an ambiguous target role set', async () => {
    const ambiguousTarget = {
      ...participant('ambiguous', RoleName.CLIENT),
      roles: [
        { role: { name: RoleName.CLIENT } },
        { role: { name: RoleName.REVIEWER } },
      ],
    };
    const fixture = createFixture(
      participant('developer', RoleName.DEVELOPER),
      ambiguousTarget,
    );

    await expect(
      fixture.service.getUser('developer', 'ambiguous'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'developer',
        action: 'USER_MANAGEMENT_DENIED',
        targetId: 'ambiguous',
        afterSummary: {
          attemptedAction: 'VIEW',
          denialCategory: 'INVALID_TARGET_ROLE_SET',
        },
      }),
    });
  });

  it('protects the final active Developer inside the state transaction', async () => {
    const fixture = createFixture(
      participant('developer-1', RoleName.DEVELOPER),
      participant('developer-2', RoleName.DEVELOPER),
    );
    fixture.transaction.user.findMany.mockResolvedValue([
      { roles: [{ role: { name: RoleName.DEVELOPER } }] },
    ]);

    await expect(
      fixture.service.changeStatus('developer-1', 'developer-2', {
        status: UserStatus.DISABLED,
        reason: 'Planned privileged account retirement',
      }),
    ).rejects.toMatchObject({
      message: 'The final active Developer account must remain active',
      status: 403,
    });
    expect(fixture.transaction.user.update).not.toHaveBeenCalled();
  });

  it('suspends an eligible user, revokes sessions, audits, and notifies', async () => {
    const fixture = createFixture();
    jest
      .spyOn(fixture.service, 'getUser')
      .mockImplementation(() => Promise.resolve({} as never));

    await fixture.service.changeStatus('actor', 'target', {
      status: UserStatus.SUSPENDED,
      reason: 'Investigating a verified account security report',
    });

    expect(fixture.transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'target' },
      data: expect.objectContaining({ status: UserStatus.SUSPENDED }),
    });
    expect(fixture.transaction.refreshSession.updateMany).toHaveBeenCalled();
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'USER_SUSPENDED' }),
    });
    expect(fixture.transaction.notification.create).toHaveBeenCalled();
  });

  it('soft-deletes without touching properties and revokes sessions and reset tokens', async () => {
    const fixture = createFixture();
    jest
      .spyOn(fixture.service, 'getUser')
      .mockImplementation(() => Promise.resolve({} as never));

    await fixture.service.softDelete('actor', 'target', {
      reason: 'Account owner requested deactivation',
    });

    expect(fixture.transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'target' },
      data: expect.objectContaining({
        status: UserStatus.DISABLED,
        deletedAt: expect.any(Date),
        deletionReason: 'Account owner requested deactivation',
      }),
    });
    expect(fixture.transaction.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'target', revokedAt: null } }),
    );
    expect(
      fixture.transaction.passwordResetToken.updateMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'target', usedAt: null, revokedAt: null },
      }),
    );
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'USER_SOFT_DELETED' }),
    });
    expect(fixture.transaction.property.updateMany).not.toHaveBeenCalled();
  });

  it('makes repeated soft deletion idempotent', async () => {
    const target = {
      ...participant('target', RoleName.REVIEWER),
      status: UserStatus.DISABLED,
      deletedAt: new Date(),
    };
    const fixture = createFixture(participant('actor', RoleName.ADMIN), target);
    jest
      .spyOn(fixture.service, 'getUser')
      .mockImplementation(() => Promise.resolve({} as never));

    await fixture.service.softDelete('actor', 'target', {
      reason: 'Repeated safe request',
    });

    expect(fixture.transaction.user.update).not.toHaveBeenCalled();
    expect(fixture.transaction.auditLog.create).not.toHaveBeenCalled();
  });

  it('restores an eligible account without reviving old sessions', async () => {
    const target = {
      ...participant('target', RoleName.CLIENT),
      status: UserStatus.DISABLED,
      deletedAt: new Date(),
    };
    const fixture = createFixture(participant('actor', RoleName.ADMIN), target);
    jest
      .spyOn(fixture.service, 'getUser')
      .mockImplementation(() => Promise.resolve({} as never));

    await fixture.service.restore('actor', 'target', {
      reason: 'Identity and account ownership were verified',
    });

    expect(fixture.transaction.user.update).toHaveBeenCalledWith({
      where: { id: 'target' },
      data: expect.objectContaining({
        status: UserStatus.ACTIVE,
        deletedAt: null,
        deletionReason: null,
      }),
    });
    expect(
      fixture.transaction.refreshSession.updateMany,
    ).not.toHaveBeenCalled();
    expect(
      fixture.transaction.passwordResetToken.updateMany,
    ).toHaveBeenCalled();
  });

  it('stores only a reset-token hash and returns no token or password', async () => {
    const fixture = createFixture();

    const response = await fixture.service.initiatePasswordReset(
      'actor',
      'target',
      { reason: 'Verified recovery request from account holder' },
    );

    const createCall = fixture.transaction.passwordResetToken.create.mock
      .calls[0][0] as { data: { tokenHash: string } };
    const deliveryCall = fixture.sendPasswordReset.mock.calls[0][0] as {
      rawToken: string;
    };
    expect(createCall.data.tokenHash).toHaveLength(64);
    expect(createCall.data.tokenHash).not.toBe(deliveryCall.rawToken);
    expect(response).toEqual({
      accepted: true,
      message: 'Password reset instructions were sent to the account email',
    });
    expect(response).not.toHaveProperty('token');
    expect(response).not.toHaveProperty('password');
  });

  it('revokes an undelivered token and audits a delivery failure', async () => {
    const fixture = createFixture();
    fixture.sendPasswordReset.mockRejectedValueOnce(
      new Error('delivery unavailable'),
    );

    await expect(
      fixture.service.initiatePasswordReset('actor', 'target', {
        reason: 'Verified recovery request from account holder',
      }),
    ).rejects.toThrow('delivery unavailable');

    expect(
      fixture.transaction.passwordResetToken.updateMany,
    ).toHaveBeenCalledWith({
      where: {
        id: 'reset-token-id',
        revokedAt: null,
        usedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'actor',
        action: 'PASSWORD_RESET_DELIVERY_FAILED',
        targetType: 'User',
        targetId: 'target',
        afterSummary: { deliveryConfigured: false },
      },
    });
  });
});
