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
      property: { updateMany: jest.fn() },
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
      passwordResetToken: transaction.passwordResetToken,
      auditLog: transaction.auditLog,
    } as unknown as PrismaService;
    const sendPasswordReset = jest.fn().mockResolvedValue(undefined);
    const delivery = {
      sendPasswordReset,
    } as unknown as PasswordResetDeliveryService;
    const service = new UserManagementService(prisma, delivery);

    return {
      service,
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
