import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  NotificationType,
  Prisma,
  RoleName,
  UserStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import {
  assertAllowedRoleCombination,
  hasExactRoleSet,
  normalizeRoleSet,
} from '../roles/role-combination.policy';
import { hashPasswordResetToken } from '../password-reset/password-reset.service';
import { PasswordResetDeliveryService } from '../password-reset/password-reset-delivery.service';
import type { ChangeUserStatusDto } from './dto/change-user-status.dto';
import type { ManagementReasonDto } from './dto/management-reason.dto';
import type { UserListQueryDto, UserSort } from './dto/user-list-query.dto';
import type { UpdateManagedUserDto } from './dto/update-managed-user.dto';
import {
  assertCanManageUser,
  getAllowedUserManagementActions,
  getManagementActorRole,
  type UserManagementAction,
} from './user-management.policy';

const PASSWORD_RESET_LIFETIME_MILLISECONDS = 30 * 60 * 1_000;

const managementUserSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  language: true,
  status: true,
  statusChangedAt: true,
  deletedAt: true,
  deletionReason: true,
  createdAt: true,
  updatedAt: true,
  roles: {
    select: {
      assignedAt: true,
      systemReason: true,
      assignedBy: { select: { name: true } },
      role: { select: { name: true } },
    },
  },
} satisfies Prisma.UserSelect;

const participantSelect = {
  id: true,
  email: true,
  name: true,
  status: true,
  deletedAt: true,
  roles: { select: { role: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

type ManagementUserRecord = Prisma.UserGetPayload<{
  select: typeof managementUserSelect;
}>;

type ParticipantRecord = Prisma.UserGetPayload<{
  select: typeof participantSelect;
}>;

type DatabaseClient = PrismaService | Prisma.TransactionClient;

interface RecordWithRoles {
  roles: Array<{ role: { name: RoleName } }>;
}

function roleNames(user: RecordWithRoles): RoleName[] {
  return normalizeRoleSet(user.roles.map(({ role }) => role.name));
}

function effectiveActions(
  actor: ParticipantRecord,
  target: ManagementUserRecord,
): UserManagementAction[] {
  const actions = getAllowedUserManagementActions(
    actor.id,
    roleNames(actor),
    target.id,
    roleNames(target),
  );

  return actions.filter((action) => {
    if (action === 'VIEW') return true;
    if (action === 'RESTORE') {
      return Boolean(target.deletedAt) || target.status !== UserStatus.ACTIVE;
    }
    if (target.deletedAt) return false;
    if (action === 'CHANGE_STATUS') {
      return target.status !== UserStatus.DISABLED;
    }
    if (action === 'SOFT_DELETE') return true;
    if (action === 'INITIATE_PASSWORD_RESET') {
      return target.status !== UserStatus.DISABLED;
    }
    return true;
  });
}

function mapUserSummary(actor: ParticipantRecord, user: ManagementUserRecord) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    language: user.language,
    status: user.status,
    statusChangedAt: user.statusChangedAt,
    roles: roleNames(user),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
    isDeleted: Boolean(user.deletedAt),
    allowedActions: effectiveActions(actor, user),
  };
}

function asRecord(value: Prisma.JsonValue | null): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : {};
}

function safeAuditSummary(value: Prisma.JsonValue | null) {
  const source = asRecord(value);
  const safe: Record<string, unknown> = {};

  for (const key of [
    'status',
    'deleted',
    'changedFields',
    'reason',
    'roles',
    'sessionsRevoked',
    'revokedSessionCount',
    'expiresAt',
  ]) {
    if (key in source) safe[key] = source[key];
  }

  return Object.keys(safe).length > 0 ? safe : null;
}

function userOrderBy(sort: UserSort): Prisma.UserOrderByWithRelationInput[] {
  switch (sort) {
    case 'created_asc':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'name_asc':
      return [{ name: 'asc' }, { id: 'asc' }];
    case 'name_desc':
      return [{ name: 'desc' }, { id: 'asc' }];
    case 'email_asc':
      return [{ email: 'asc' }, { id: 'asc' }];
    case 'status_asc':
      return [{ status: 'asc' }, { id: 'asc' }];
    case 'created_desc':
    default:
      return [{ createdAt: 'desc' }, { id: 'asc' }];
  }
}

@Injectable()
export class UserManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resetDelivery: PasswordResetDeliveryService,
  ) {}

  async listUsers(actorId: string, query: UserListQueryDto) {
    const actor = await this.loadActor(this.prisma, actorId);
    const where: Prisma.UserWhereInput = {
      ...(query.includeDeleted ? {} : { deletedAt: null }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.role
        ? { roles: { some: { role: { name: query.role } } } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: managementUserSelect,
        orderBy: userOrderBy(query.sort),
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map((user) => mapUserSummary(actor, user)),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async getUser(actorId: string, targetId: string) {
    const [actor, target, activeSessionCount, auditHistory] = await Promise.all(
      [
        this.loadActor(this.prisma, actorId),
        this.prisma.user.findUnique({
          where: { id: targetId },
          select: {
            ...managementUserSelect,
            _count: {
              select: {
                properties: true,
                reviewDecisions: true,
              },
            },
          },
        }),
        this.prisma.refreshSession.count({
          where: {
            userId: targetId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
          },
        }),
        this.prisma.auditLog.findMany({
          where: { targetType: 'User', targetId },
          select: {
            id: true,
            action: true,
            beforeSummary: true,
            afterSummary: true,
            createdAt: true,
            actor: { select: { name: true } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 50,
        }),
      ],
    );

    if (!target) throw new NotFoundException('User not found');
    assertCanManageUser(
      actor.id,
      roleNames(actor),
      target.id,
      roleNames(target),
      'VIEW',
    );

    return {
      ...mapUserSummary(actor, target),
      activity: {
        activeSessionCount,
        propertiesOwned: target._count.properties,
        reviewDecisions: target._count.reviewDecisions,
      },
      roleHistory: target.roles
        .map((assignment) => ({
          role: assignment.role.name,
          assignedAt: assignment.assignedAt,
          assignedByName: assignment.assignedBy?.name ?? null,
          systemReason: assignment.systemReason,
        }))
        .sort(
          (left, right) =>
            left.assignedAt.getTime() - right.assignedAt.getTime(),
        ),
      auditHistory: auditHistory.map((audit) => ({
        id: audit.id,
        action: audit.action,
        actorName: audit.actor.name,
        before: safeAuditSummary(audit.beforeSummary),
        after: safeAuditSummary(audit.afterSummary),
        createdAt: audit.createdAt,
      })),
    };
  }

  async updateUser(
    actorId: string,
    targetId: string,
    input: UpdateManagedUserDto,
  ) {
    await this.prisma.$transaction(async (transaction) => {
      const { actor, target } = await this.loadParticipants(
        transaction,
        actorId,
        targetId,
        'EDIT_PROFILE',
      );
      if (target.deletedAt) {
        throw new ConflictException('Restore the account before editing it');
      }

      const data: Prisma.UserUpdateInput = {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.language !== undefined ? { language: input.language } : {}),
      };
      const changedFields = Object.entries(data)
        .filter(([key, value]) => target[key as keyof typeof target] !== value)
        .map(([key]) => key);

      if (changedFields.length === 0) return;

      await transaction.user.update({ where: { id: targetId }, data });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'USER_PROFILE_UPDATED',
          targetType: 'User',
          targetId,
          beforeSummary: { changedFields },
          afterSummary: { changedFields },
        },
      });
    });

    return this.getUser(actorId, targetId);
  }

  async changeStatus(
    actorId: string,
    targetId: string,
    input: ChangeUserStatusDto,
  ) {
    await this.prisma.$transaction(
      async (transaction) => {
        const { actor, target, targetRoles } = await this.loadParticipants(
          transaction,
          actorId,
          targetId,
          'CHANGE_STATUS',
        );
        if (target.deletedAt) {
          throw new ConflictException('Restore the deleted account first');
        }
        if (target.status === UserStatus.DISABLED) {
          throw new ConflictException('Use restore to activate this account');
        }
        if (target.status === input.status) {
          throw new ConflictException('Account already has this status');
        }

        await this.protectFinalDeveloper(transaction, target, targetRoles);
        const now = new Date();

        await transaction.user.update({
          where: { id: targetId },
          data: { status: input.status, statusChangedAt: now },
        });
        const sessions = await transaction.refreshSession.updateMany({
          where: { userId: targetId, revokedAt: null },
          data: { revokedAt: now },
        });
        if (input.status === UserStatus.DISABLED) {
          await this.revokeResetTokens(transaction, targetId, now);
        }
        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action:
              input.status === UserStatus.SUSPENDED
                ? 'USER_SUSPENDED'
                : 'USER_DISABLED',
            targetType: 'User',
            targetId,
            beforeSummary: { status: target.status },
            afterSummary: {
              status: input.status,
              reason: input.reason,
              revokedSessionCount: sessions.count,
            },
          },
        });
        await this.notifyStatusChange(transaction, targetId, input.status);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.getUser(actorId, targetId);
  }

  async softDelete(
    actorId: string,
    targetId: string,
    input: ManagementReasonDto,
  ) {
    await this.prisma.$transaction(
      async (transaction) => {
        const { actor, target, targetRoles } = await this.loadParticipants(
          transaction,
          actorId,
          targetId,
          'SOFT_DELETE',
        );
        if (target.deletedAt) return;

        await this.protectFinalDeveloper(transaction, target, targetRoles);
        const now = new Date();
        await transaction.user.update({
          where: { id: targetId },
          data: {
            status: UserStatus.DISABLED,
            statusChangedAt: now,
            deletedAt: now,
            deletionReason: input.reason,
          },
        });
        const sessions = await transaction.refreshSession.updateMany({
          where: { userId: targetId, revokedAt: null },
          data: { revokedAt: now },
        });
        await this.revokeResetTokens(transaction, targetId, now);
        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'USER_SOFT_DELETED',
            targetType: 'User',
            targetId,
            beforeSummary: {
              status: target.status,
              deleted: false,
            },
            afterSummary: {
              status: UserStatus.DISABLED,
              deleted: true,
              reason: input.reason,
              revokedSessionCount: sessions.count,
            },
          },
        });
        await this.notifyStatusChange(
          transaction,
          targetId,
          UserStatus.DISABLED,
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.getUser(actorId, targetId);
  }

  async restore(actorId: string, targetId: string, input: ManagementReasonDto) {
    await this.prisma.$transaction(
      async (transaction) => {
        const { actor, target, targetRoles } = await this.loadParticipants(
          transaction,
          actorId,
          targetId,
          'RESTORE',
        );
        assertAllowedRoleCombination(targetRoles);
        if (!target.deletedAt && target.status === UserStatus.ACTIVE) {
          throw new ConflictException('Account is already active');
        }

        const now = new Date();
        await transaction.user.update({
          where: { id: targetId },
          data: {
            status: UserStatus.ACTIVE,
            statusChangedAt: now,
            deletedAt: null,
            deletionReason: null,
          },
        });
        await this.revokeResetTokens(transaction, targetId, now);
        await transaction.auditLog.create({
          data: {
            actorId: actor.id,
            action: 'USER_RESTORED',
            targetType: 'User',
            targetId,
            beforeSummary: {
              status: target.status,
              deleted: Boolean(target.deletedAt),
            },
            afterSummary: {
              status: UserStatus.ACTIVE,
              deleted: false,
              reason: input.reason,
              sessionsRevoked: true,
            },
          },
        });
        await this.notifyStatusChange(transaction, targetId, UserStatus.ACTIVE);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.getUser(actorId, targetId);
  }

  async revokeSessions(
    actorId: string,
    targetId: string,
    input: ManagementReasonDto,
  ): Promise<{ revokedSessionCount: number }> {
    return this.prisma.$transaction(async (transaction) => {
      const { actor } = await this.loadParticipants(
        transaction,
        actorId,
        targetId,
        'REVOKE_SESSIONS',
      );
      const sessions = await transaction.refreshSession.updateMany({
        where: { userId: targetId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'USER_SESSIONS_REVOKED',
          targetType: 'User',
          targetId,
          afterSummary: {
            reason: input.reason,
            revokedSessionCount: sessions.count,
          },
        },
      });

      return { revokedSessionCount: sessions.count };
    });
  }

  async initiatePasswordReset(
    actorId: string,
    targetId: string,
    input: ManagementReasonDto,
  ): Promise<{ accepted: true; message: string }> {
    const rawToken = randomBytes(32).toString('base64url');
    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + PASSWORD_RESET_LIFETIME_MILLISECONDS,
    );
    const tokenHash = hashPasswordResetToken(rawToken);
    const prepared = await this.prisma.$transaction(async (transaction) => {
      const { actor, target } = await this.loadParticipants(
        transaction,
        actorId,
        targetId,
        'INITIATE_PASSWORD_RESET',
      );
      if (target.deletedAt || target.status === UserStatus.DISABLED) {
        throw new ConflictException(
          'Restore the account before initiating a password reset',
        );
      }

      await this.revokeResetTokens(transaction, targetId, now);
      const resetToken = await transaction.passwordResetToken.create({
        data: { userId: targetId, tokenHash, expiresAt },
        select: { id: true },
      });
      await transaction.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'PASSWORD_RESET_INITIATED',
          targetType: 'User',
          targetId,
          afterSummary: {
            reason: input.reason,
            expiresAt: expiresAt.toISOString(),
          },
        },
      });

      return {
        resetTokenId: resetToken.id,
        email: target.email,
        name: target.name,
      };
    });

    try {
      await this.resetDelivery.sendPasswordReset({
        userId: targetId,
        email: prepared.email,
        name: prepared.name,
        rawToken,
        expiresAt,
      });
    } catch (error: unknown) {
      await this.prisma.$transaction([
        this.prisma.passwordResetToken.updateMany({
          where: { id: prepared.resetTokenId, revokedAt: null, usedAt: null },
          data: { revokedAt: new Date() },
        }),
        this.prisma.auditLog.create({
          data: {
            actorId,
            action: 'PASSWORD_RESET_DELIVERY_FAILED',
            targetType: 'User',
            targetId,
            afterSummary: { deliveryConfigured: false },
          },
        }),
      ]);
      throw error;
    }

    return {
      accepted: true,
      message: 'Password reset instructions were sent to the account email',
    };
  }

  private async loadActor(
    database: DatabaseClient,
    actorId: string,
  ): Promise<ParticipantRecord> {
    const actor = await database.user.findUnique({
      where: {
        id: actorId,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      select: participantSelect,
    });
    const actorRole = actor ? getManagementActorRole(roleNames(actor)) : null;

    if (!actor || !actorRole) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return actor;
  }

  private async loadParticipants(
    transaction: Prisma.TransactionClient,
    actorId: string,
    targetId: string,
    action: UserManagementAction,
  ): Promise<{
    actor: ParticipantRecord;
    target: ParticipantRecord;
    targetRoles: RoleName[];
  }> {
    const [actor, target] = await Promise.all([
      this.loadActor(transaction, actorId),
      transaction.user.findUnique({
        where: { id: targetId },
        select: participantSelect,
      }),
    ]);

    if (!target) throw new NotFoundException('User not found');
    const targetRoles = roleNames(target);
    assertCanManageUser(
      actor.id,
      roleNames(actor),
      target.id,
      targetRoles,
      action,
    );

    return { actor, target, targetRoles };
  }

  private async protectFinalDeveloper(
    transaction: Prisma.TransactionClient,
    target: ParticipantRecord,
    targetRoles: readonly RoleName[],
  ): Promise<void> {
    if (
      target.status !== UserStatus.ACTIVE ||
      target.deletedAt ||
      !hasExactRoleSet(targetRoles, [RoleName.DEVELOPER])
    ) {
      return;
    }

    const activeDeveloperCandidates = await transaction.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        deletedAt: null,
        roles: { some: { role: { name: RoleName.DEVELOPER } } },
      },
      select: {
        roles: { select: { role: { select: { name: true } } } },
      },
    });
    const activeDevelopers = activeDeveloperCandidates.filter((user) =>
      hasExactRoleSet(
        user.roles.map(({ role }) => role.name),
        [RoleName.DEVELOPER],
      ),
    ).length;

    if (activeDevelopers <= 1) {
      throw new ForbiddenException(
        'The final active Developer account must remain active',
      );
    }
  }

  private revokeResetTokens(
    transaction: Prisma.TransactionClient,
    targetId: string,
    revokedAt: Date,
  ) {
    return transaction.passwordResetToken.updateMany({
      where: { userId: targetId, usedAt: null, revokedAt: null },
      data: { revokedAt },
    });
  }

  private notifyStatusChange(
    transaction: Prisma.TransactionClient,
    targetId: string,
    status: UserStatus,
  ) {
    return transaction.notification.create({
      data: {
        recipientId: targetId,
        type: NotificationType.ACCOUNT_STATUS_CHANGED,
        payload: { status },
      },
    });
  }
}
