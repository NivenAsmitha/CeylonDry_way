import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { argon2id, hash as hashPassword, verify } from 'argon2';
import { NotificationType, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { assertAllowedRoleCombination } from '../roles/role-combination.policy';
import type { UpdateProfileDto } from './dto/update-profile.dto';
import type { ChangePasswordDto } from './dto/change-password.dto';
import { mapSafeUser, safeUserSelect } from './user.mapper';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: safeUserSelect,
    });

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.mapValidUser(user);
  }

  async updateCurrentUser(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<AuthenticatedUser> {
    const data = {
      ...(updateProfileDto.name !== undefined
        ? { name: updateProfileDto.name }
        : {}),
      ...(updateProfileDto.phone !== undefined
        ? { phone: updateProfileDto.phone }
        : {}),
      ...(updateProfileDto.language !== undefined
        ? { language: updateProfileDto.language }
        : {}),
    };

    if (Object.keys(data).length === 0) {
      return this.getCurrentUser(userId);
    }

    const user = await this.prisma.$transaction(async (transaction) => {
      const updateResult = await transaction.user.updateMany({
        where: {
          id: userId,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        data,
      });

      if (updateResult.count !== 1) {
        return null;
      }

      return transaction.user.findUnique({
        where: { id: userId },
        select: safeUserSelect,
      });
    });

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    return this.mapValidUser(user);
  }

  async changePassword(
    userId: string,
    input: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (input.newPassword !== input.confirmPassword) {
      throw new BadRequestException('Password confirmation does not match');
    }
    if (input.currentPassword === input.newPassword) {
      throw new BadRequestException(
        'New password must differ from the current password',
      );
    }

    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: { id: true, passwordHash: true },
    });

    let currentPasswordIsValid = false;
    if (user) {
      try {
        currentPasswordIsValid = await verify(
          user.passwordHash,
          input.currentPassword,
        );
      } catch {
        currentPasswordIsValid = false;
      }
    }
    if (!user || !currentPasswordIsValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const nextPasswordHash = await hashPassword(input.newPassword, {
      type: argon2id,
    });
    const now = new Date();
    const changed = await this.prisma.$transaction(async (transaction) => {
      const update = await transaction.user.updateMany({
        where: {
          id: user.id,
          passwordHash: user.passwordHash,
          status: UserStatus.ACTIVE,
          deletedAt: null,
        },
        data: { passwordHash: nextPasswordHash },
      });
      if (update.count !== 1) return false;

      await transaction.refreshSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now },
      });
      await transaction.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          usedAt: null,
          revokedAt: null,
        },
        data: { revokedAt: now },
      });
      await transaction.auditLog.create({
        data: {
          actorId: user.id,
          action: 'PASSWORD_CHANGED_BY_USER',
          targetType: 'User',
          targetId: user.id,
          afterSummary: { sessionsRevoked: true },
        },
      });
      await transaction.notification.create({
        data: {
          recipientId: user.id,
          type: NotificationType.PASSWORD_CHANGED,
          payload: { source: 'PROFILE' },
        },
      });
      return true;
    });

    if (!changed) {
      throw new UnauthorizedException(
        'Password changed in another session. Sign in again.',
      );
    }
    return { message: 'Password changed successfully' };
  }

  private mapValidUser(
    user: Parameters<typeof mapSafeUser>[0],
  ): AuthenticatedUser {
    const mappedUser = mapSafeUser(user);

    try {
      assertAllowedRoleCombination(mappedUser.roles);
    } catch {
      throw new UnauthorizedException('Authentication required');
    }

    return mappedUser;
  }
}
