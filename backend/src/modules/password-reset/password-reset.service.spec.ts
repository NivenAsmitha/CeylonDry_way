/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, Logger } from '@nestjs/common';
import { verify as verifyPassword } from 'argon2';
import { NotificationType, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import {
  hashPasswordResetToken,
  PasswordResetService,
} from './password-reset.service';
import {
  type PasswordResetDelivery,
  PasswordResetDeliveryService,
} from './password-reset-delivery.service';

const RAW_TOKEN = 'a'.repeat(43);
const NEW_PASSWORD = 'NewStrongPassword123!';

describe('PasswordResetService', () => {
  function createFixture(
    tokenOverrides: Partial<{
      expiresAt: Date;
      usedAt: Date | null;
      revokedAt: Date | null;
      status: UserStatus;
      deletedAt: Date | null;
    }> = {},
    claimCount = 1,
  ) {
    let persistedPasswordHash = '';
    const transaction = {
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
      },
      user: {
        update: jest.fn().mockImplementation(({ data }) => {
          persistedPasswordHash = data.passwordHash;
          return Promise.resolve({ id: 'user-1' });
        }),
      },
      refreshSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
      notification: {
        create: jest.fn().mockResolvedValue({ id: 'notification-1' }),
      },
    };
    const transactionRunner = jest.fn(
      async (work: (client: typeof transaction) => Promise<unknown>) =>
        work(transaction),
    );
    const tokenRecord = {
      id: 'token-1',
      userId: 'user-1',
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      revokedAt: null,
      user: { status: UserStatus.ACTIVE, deletedAt: null },
      ...tokenOverrides,
    };
    if ('status' in tokenOverrides || 'deletedAt' in tokenOverrides) {
      tokenRecord.user = {
        status: tokenOverrides.status ?? UserStatus.ACTIVE,
        deletedAt: tokenOverrides.deletedAt ?? null,
      };
    }
    const findUnique = jest.fn().mockResolvedValue(tokenRecord);
    const prisma = {
      passwordResetToken: { findUnique },
      $transaction: transactionRunner,
    } as unknown as PrismaService;

    const delivery = {
      sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    } as unknown as PasswordResetDeliveryService;

    return {
      service: new PasswordResetService(prisma, delivery),
      transaction,
      transactionRunner,
      findUnique,
      getPersistedPasswordHash: () => persistedPasswordHash,
    };
  }

  function createRequestFixture(options?: {
    user?: {
      id: string;
      email: string;
      name: string;
      status: UserStatus;
      deletedAt: Date | null;
    } | null;
    deliveryError?: Error;
  }) {
    const user =
      options?.user === undefined
        ? {
            id: 'user-1',
            email: 'traveller@example.test',
            name: 'Traveller',
            status: UserStatus.ACTIVE,
            deletedAt: null,
          }
        : options.user;
    const transaction = {
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        create: jest.fn().mockResolvedValue({ id: 'reset-token-1' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-1' }) },
    };
    const revokeUndeliveredToken = jest.fn().mockResolvedValue({ count: 1 });
    const transactionRunner = jest.fn(
      async (
        work:
          | ((client: typeof transaction) => Promise<unknown>)
          | Promise<unknown>[],
      ) => (Array.isArray(work) ? Promise.all(work) : work(transaction)),
    );
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
      passwordResetToken: {
        updateMany: revokeUndeliveredToken,
      },
      auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit-2' }) },
      $transaction: transactionRunner,
    } as unknown as PrismaService;
    const sendPasswordReset =
      jest.fn<(delivery: PasswordResetDelivery) => Promise<void>>();
    if (options?.deliveryError) {
      sendPasswordReset.mockRejectedValue(options.deliveryError);
    } else {
      sendPasswordReset.mockResolvedValue(undefined);
    }
    const delivery = {
      sendPasswordReset,
    } as unknown as PasswordResetDeliveryService;

    return {
      service: new PasswordResetService(prisma, delivery),
      prisma,
      transaction,
      transactionRunner,
      revokeUndeliveredToken,
      sendPasswordReset,
    };
  }

  it('issues a hashed, single-use reset token for an active account', async () => {
    const fixture = createRequestFixture();

    await expect(
      fixture.service.request({ email: 'traveller@example.test' }),
    ).resolves.toEqual({
      accepted: true,
      message:
        'If an active account exists for that email, password reset instructions have been sent.',
    });

    expect(fixture.sendPasswordReset).toHaveBeenCalledTimes(1);
    const delivery = fixture.sendPasswordReset.mock
      .calls[0][0] as PasswordResetDelivery;
    expect(delivery.rawToken).toHaveLength(43);
    expect(
      fixture.transaction.passwordResetToken.updateMany,
    ).toHaveBeenCalled();
    expect(fixture.transaction.passwordResetToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: hashPasswordResetToken(delivery.rawToken),
      }),
      select: { id: true },
    });
    expect(
      fixture.transaction.passwordResetToken.create.mock.calls[0][0].data,
    ).not.toHaveProperty('rawToken');
  });

  it('returns the same safe response without delivery for an unknown email', async () => {
    const fixture = createRequestFixture({ user: null });

    await expect(
      fixture.service.request({ email: 'unknown@example.test' }),
    ).resolves.toEqual({
      accepted: true,
      message:
        'If an active account exists for that email, password reset instructions have been sent.',
    });
    expect(fixture.sendPasswordReset).not.toHaveBeenCalled();
    expect(fixture.transactionRunner).not.toHaveBeenCalled();
  });

  it('revokes an undelivered token but keeps the public response generic', async () => {
    const logError = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const fixture = createRequestFixture({
      deliveryError: new Error('Email provider unavailable'),
    });

    await expect(
      fixture.service.request({ email: 'traveller@example.test' }),
    ).resolves.toMatchObject({ accepted: true });
    expect(fixture.revokeUndeliveredToken).toHaveBeenCalledWith({
      where: {
        id: 'reset-token-1',
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
    logError.mockRestore();
  });

  it('hashes the token deterministically without storing or querying the raw token', async () => {
    const fixture = createFixture();

    await fixture.service.complete({
      token: RAW_TOKEN,
      newPassword: NEW_PASSWORD,
      confirmPassword: NEW_PASSWORD,
    });

    expect(fixture.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tokenHash: hashPasswordResetToken(RAW_TOKEN) },
      }),
    );
    expect(hashPasswordResetToken(RAW_TOKEN)).not.toBe(RAW_TOKEN);
  });

  it('claims once, stores an Argon2id password, revokes sessions, audits, and notifies', async () => {
    const fixture = createFixture();

    await expect(
      fixture.service.complete({
        token: RAW_TOKEN,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    ).resolves.toEqual({ message: 'Password reset completed' });

    expect(fixture.getPersistedPasswordHash()).toMatch(/^\$argon2id\$/);
    await expect(
      verifyPassword(fixture.getPersistedPasswordHash(), NEW_PASSWORD),
    ).resolves.toBe(true);
    expect(fixture.transaction.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
    );
    expect(fixture.transaction.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        recipientId: 'user-1',
        type: NotificationType.PASSWORD_CHANGED,
      }),
    });
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PASSWORD_RESET_COMPLETED' }),
    });
  });

  it.each([
    ['expired', { expiresAt: new Date(Date.now() - 1) }],
    ['used', { usedAt: new Date() }],
    ['revoked', { revokedAt: new Date() }],
    ['deleted user', { deletedAt: new Date() }],
    ['disabled user', { status: UserStatus.DISABLED }],
  ])(
    'rejects an %s token with the same safe error',
    async (_label, overrides) => {
      const fixture = createFixture(overrides);

      await expect(
        fixture.service.complete({
          token: RAW_TOKEN,
          newPassword: NEW_PASSWORD,
          confirmPassword: NEW_PASSWORD,
        }),
      ).rejects.toMatchObject({
        message: 'Password reset token is invalid or expired',
        status: 400,
      });
      expect(fixture.transactionRunner).not.toHaveBeenCalled();
    },
  );

  it('rejects concurrent reuse when the atomic token claim loses the race', async () => {
    const fixture = createFixture({}, 0);

    await expect(
      fixture.service.complete({
        token: RAW_TOKEN,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fixture.transaction.user.update).not.toHaveBeenCalled();
  });
});
