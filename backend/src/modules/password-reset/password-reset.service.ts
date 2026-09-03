import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { argon2id, hash as hashPassword } from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import { NotificationType, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetDeliveryService } from './password-reset-delivery.service';

const INVALID_RESET_TOKEN_MESSAGE =
  'Password reset token is invalid or expired';
const PASSWORD_RESET_LIFETIME_MILLISECONDS = 30 * 60 * 1_000;
const REQUEST_ACCEPTED_RESPONSE = {
  accepted: true as const,
  message:
    'If an active account exists for that email, password reset instructions have been sent.',
};

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: PasswordResetDeliveryService,
  ) {}

  async request(
    input: RequestPasswordResetDto,
  ): Promise<{ accepted: true; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: {
        id: true,
        email: true,
        name: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      return REQUEST_ACCEPTED_RESPONSE;
    }

    const rawToken = randomBytes(32).toString('base64url');
    const tokenHash = hashPasswordResetToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + PASSWORD_RESET_LIFETIME_MILLISECONDS,
    );
    const resetToken = await this.prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      const created = await transaction.passwordResetToken.create({
        data: { userId: user.id, tokenHash, expiresAt },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: 'PASSWORD_RESET_REQUESTED',
          targetType: 'User',
          targetId: user.id,
          afterSummary: { expiresAt: expiresAt.toISOString() },
        },
      });

      return created;
    });

    try {
      await this.delivery.sendPasswordReset({
        userId: user.id,
        email: user.email,
        name: user.name,
        rawToken,
        expiresAt,
      });
    } catch (error: unknown) {
      this.logger.error(
        `Password-reset delivery failed for user ${user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { id: resetToken.id, usedAt: null, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.auditLog.create({
          data: {
            actorId: user.id,
            action: 'PASSWORD_RESET_DELIVERY_FAILED',
            targetType: 'User',
            targetId: user.id,
            afterSummary: { deliveryConfigured: false },
          },
        }),
      ]);
    }

    return REQUEST_ACCEPTED_RESPONSE;
  }

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
