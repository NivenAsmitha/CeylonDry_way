/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException } from '@nestjs/common';
import { verify as verifyPassword } from 'argon2';
import { NotificationType, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import {
  hashPasswordResetToken,
  PasswordResetService,
} from './password-reset.service';

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

    return {
      service: new PasswordResetService(prisma),
      transaction,
      transactionRunner,
      findUnique,
      getPersistedPasswordHash: () => persistedPasswordHash,
    };
  }

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
