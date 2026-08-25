import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { assertAllowedRoleCombination } from '../roles/role-combination.policy';
import type { UpdateProfileDto } from './dto/update-profile.dto';
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
