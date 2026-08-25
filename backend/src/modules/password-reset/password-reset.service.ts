import { BadRequestException, Injectable } from '@nestjs/common';
import { argon2id, hash as hashPassword } from 'argon2';
import { createHash } from 'node:crypto';
import { NotificationType, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { ResetPasswordDto } from './dto/reset-password.dto';

const INVALID_RESET_TOKEN_MESSAGE =
  'Password reset token is invalid or expired';

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class PasswordResetService {
  constructor(private readonly prisma: PrismaService) {}

  async complete(input: ResetPasswordDto): Promise<{ message: string }> {
    if (input.newPassword !== input.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }

    const tokenHash = hashPasswordResetToken(input.token);
    const now = new Date();
    const tokenRecord = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        revokedAt: true,
        user: {
          select: {
            status: true,
            deletedAt: true,
          },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt <= now ||
      tokenRecord.user.deletedAt ||
      tokenRecord.user.status === UserStatus.DISABLED
    ) {
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const passwordHash = await hashPassword(input.newPassword, {
      type: argon2id,
    });

    const completed = await this.prisma.$transaction(async (transaction) => {
      const claim = await transaction.passwordResetToken.updateMany({
        where: {
          id: tokenRecord.id,
          usedAt: null,
          revokedAt: null,
          expiresAt: { gt: now },
          user: {
            deletedAt: null,
            status: { not: UserStatus.DISABLED },
          },
        },
        data: { usedAt: now },
      });

      if (claim.count !== 1) {
        return false;
      }

      await transaction.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      });
      await transaction.refreshSession.updateMany({
        where: { userId: tokenRecord.userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.passwordResetToken.updateMany({
        where: {
          userId: tokenRecord.userId,
          id: { not: tokenRecord.id },
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await transaction.auditLog.create({
        data: {
          actorId: tokenRecord.userId,
          action: 'PASSWORD_RESET_COMPLETED',
          targetType: 'User',
          targetId: tokenRecord.userId,
          afterSummary: { sessionsRevoked: true },
        },
      });
      await transaction.notification.create({
        data: {
          recipientId: tokenRecord.userId,
          type: NotificationType.PASSWORD_CHANGED,
          payload: { source: 'PASSWORD_RESET' },
        },
      });

      return true;
    });

    if (!completed) {
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    return { message: 'Password reset completed' };
  }
}
