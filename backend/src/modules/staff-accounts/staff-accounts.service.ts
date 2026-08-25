import {
  ConflictException,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { argon2id, hash as hashPassword } from 'argon2';
import { RoleName, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import {
  assertAllowedRoleCombination,
  hasExactRoleSet,
} from '../roles/role-combination.policy';
import { mapSafeUser, safeUserSelect } from '../users/user.mapper';
import type { CreateStaffAccountDto } from './dto/create-staff-account.dto';

const STAFF_ACCOUNT_REASON = 'PRIVILEGED_ACCOUNT_CREATION';

function hasPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

@Injectable()
export class StaffAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  createReviewer(
    actorId: string,
    input: CreateStaffAccountDto,
  ): Promise<AuthenticatedUser> {
    return this.createStaffAccount(
      actorId,
      RoleName.ADMIN,
      RoleName.REVIEWER,
      'REVIEWER_ACCOUNT_CREATED',
      input,
    );
  }

  createAdmin(
    actorId: string,
    input: CreateStaffAccountDto,
  ): Promise<AuthenticatedUser> {
    return this.createStaffAccount(
      actorId,
      RoleName.DEVELOPER,
      RoleName.ADMIN,
      'ADMIN_ACCOUNT_CREATED',
      input,
    );
  }

  private async createStaffAccount(
    actorId: string,
    requiredActorRole: RoleName,
    targetRole: RoleName,
    auditAction: string,
    input: CreateStaffAccountDto,
  ): Promise<AuthenticatedUser> {
    assertAllowedRoleCombination([targetRole]);
    const email = input.email.trim().toLowerCase();
    const actor = await this.prisma.user.findUnique({
      where: {
        id: actorId,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    const actorRoles = actor?.roles.map(({ role }) => role.name) ?? [];

    if (!actor || !hasExactRoleSet(actorRoles, [requiredActorRole])) {
      throw new ForbiddenException('Insufficient role permissions');
    }
    if (actor.email === email) {
      throw new ForbiddenException('You cannot provision your own account');
    }

    const [existingUser, role, passwordHash] = await Promise.all([
      this.prisma.user.findUnique({ where: { email }, select: { id: true } }),
      this.prisma.role.findUnique({
        where: { name: targetRole },
        select: { id: true },
      }),
      hashPassword(input.temporaryPassword, { type: argon2id }),
    ]);

    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }
    if (!role) {
      throw new ServiceUnavailableException(
        `The required ${targetRole} role is not configured`,
      );
    }

    try {
      const user = await this.prisma.$transaction(async (transaction) => {
        const currentActor = await transaction.user.findUnique({
          where: {
            id: actorId,
            status: UserStatus.ACTIVE,
            deletedAt: null,
          },
          select: {
            id: true,
            roles: { select: { role: { select: { name: true } } } },
          },
        });
        const currentActorRoles =
          currentActor?.roles.map(
            ({ role: currentRole }) => currentRole.name,
          ) ?? [];

        if (
          !currentActor ||
          !hasExactRoleSet(currentActorRoles, [requiredActorRole])
        ) {
          throw new ForbiddenException('Insufficient role permissions');
        }

        const createdUser = await transaction.user.create({
          data: {
            name: input.name.trim(),
            email,
            passwordHash,
            phone: input.phone?.trim(),
            roles: {
              create: {
                role: { connect: { id: role.id } },
                assignedBy: { connect: { id: actorId } },
                systemReason: STAFF_ACCOUNT_REASON,
              },
            },
          },
          select: safeUserSelect,
        });

        await transaction.auditLog.create({
          data: {
            actorId,
            action: auditAction,
            targetType: 'User',
            targetId: createdUser.id,
            afterSummary: { roles: [targetRole] },
          },
        });

        return createdUser;
      });

      const mappedUser = mapSafeUser(user);
      assertAllowedRoleCombination(mappedUser.roles);
      return mappedUser;
    } catch (error: unknown) {
      if (hasPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException(
          'An account with this email already exists',
        );
      }
      throw error;
    }
  }
}
