/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import {
  argon2id,
  hash as hashPassword,
  verify as verifyPassword,
} from 'argon2';
import { NotificationType, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { UsersService } from './users.service';

const CURRENT_PASSWORD = 'CurrentPassword123!';
const NEW_PASSWORD = 'NewPassword456!';

describe('UsersService changePassword', () => {
  async function createFixture(options: { updateCount?: number } = {}) {
    const currentHash = await hashPassword(CURRENT_PASSWORD, {
      type: argon2id,
    });
    let persistedHash = '';
    const transaction = {
      user: {
        updateMany: jest.fn().mockImplementation(({ data }) => {
          persistedHash = data.passwordHash;
          return Promise.resolve({ count: options.updateCount ?? 1 });
        }),
      },
      refreshSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      passwordResetToken: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
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
    const findFirst = jest.fn().mockResolvedValue({
      id: 'user-1',
      passwordHash: currentHash,
      status: UserStatus.ACTIVE,
    });
    const prisma = {
      user: { findFirst },
      $transaction: transactionRunner,
    } as unknown as PrismaService;

    return {
      service: new UsersService(prisma),
      transaction,
      transactionRunner,
      findFirst,
      getPersistedHash: () => persistedHash,
    };
  }

  it('requires matching confirmation and a different new password', async () => {
    const fixture = await createFixture();

    await expect(
      fixture.service.changePassword('user-1', {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: 'DifferentPassword789!',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      fixture.service.changePassword('user-1', {
        currentPassword: CURRENT_PASSWORD,
        newPassword: CURRENT_PASSWORD,
        confirmPassword: CURRENT_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(fixture.findFirst).not.toHaveBeenCalled();
  });

  it('rejects an incorrect current password without changing state', async () => {
    const fixture = await createFixture();

    await expect(
      fixture.service.changePassword('user-1', {
        currentPassword: 'IncorrectPassword123!',
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(fixture.transactionRunner).not.toHaveBeenCalled();
  });

  it('stores Argon2id, revokes credentials, audits, and notifies', async () => {
    const fixture = await createFixture();

    await expect(
      fixture.service.changePassword('user-1', {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    ).resolves.toEqual({ message: 'Password changed successfully' });

    expect(fixture.getPersistedHash()).toMatch(/^\$argon2id\$/);
    await expect(
      verifyPassword(fixture.getPersistedHash(), NEW_PASSWORD),
    ).resolves.toBe(true);
    expect(fixture.transaction.refreshSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1', revokedAt: null } }),
    );
    expect(
      fixture.transaction.passwordResetToken.updateMany,
    ).toHaveBeenCalled();
    expect(fixture.transaction.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'PASSWORD_CHANGED_BY_USER' }),
    });
    expect(fixture.transaction.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: NotificationType.PASSWORD_CHANGED,
      }),
    });
  });

  it('fails closed if another password change wins the update race', async () => {
    const fixture = await createFixture({ updateCount: 0 });

    await expect(
      fixture.service.changePassword('user-1', {
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(
      fixture.transaction.refreshSession.updateMany,
    ).not.toHaveBeenCalled();
  });
});
