import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PermissionKey,
  Prisma,
  RoleName,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ALL_PERMISSION_KEYS,
  MANAGED_ACCESS_ROLES,
  PERMISSION_CATALOG,
} from './access-management.constants';
import type { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

function isManagedRole(
  role: RoleName,
): role is (typeof MANAGED_ACCESS_ROLES)[number] {
  return MANAGED_ACCESS_ROLES.includes(
    role as (typeof MANAGED_ACCESS_ROLES)[number],
  );
}

function normalizePermissions(
  permissions: readonly PermissionKey[],
): PermissionKey[] {
  const selected = new Set(permissions);
  return ALL_PERMISSION_KEYS.filter((permission) => selected.has(permission));
}

@Injectable()
export class AccessManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async getMatrix() {
    const roles = await this.prisma.role.findMany({
      where: { name: { in: [...MANAGED_ACCESS_ROLES] } },
      select: {
        name: true,
        permissions: {
          select: { permission: { select: { key: true } } },
        },
      },
    });

    const permissionsByRole = new Map(
      roles.map((role) => [
        role.name,
        normalizePermissions(
          role.permissions.map(({ permission }) => permission.key),
        ),
      ]),
    );

    return {
      permissions: PERMISSION_CATALOG,
      roles: MANAGED_ACCESS_ROLES.map((role) => ({
        role,
        permissions: permissionsByRole.get(role) ?? [],
      })),
      developer: {
        role: RoleName.DEVELOPER,
        permissions: ALL_PERMISSION_KEYS,
        editable: false,
      },
    };
  }

  async updateRole(
    actorId: string,
    roleParam: string,
    input: UpdateRolePermissionsDto,
  ) {
    const role = Object.values(RoleName).find((value) => value === roleParam);
    if (!role || !isManagedRole(role)) {
      throw new BadRequestException(
        'Only Administrator and Reviewer access can be configured',
      );
    }

    const nextPermissions = normalizePermissions(input.permissions);
    const allowed = new Set(
      PERMISSION_CATALOG.filter(({ availableTo }) =>
        availableTo.includes(role),
      ).map(({ key }) => key),
    );
    if (nextPermissions.some((permission) => !allowed.has(permission))) {
      throw new BadRequestException(
        'One or more permissions cannot be assigned to this role',
      );
    }

    await this.prisma.$transaction(
      async (transaction) => {
        const [actor, targetRole, configuredPermissions] = await Promise.all([
          transaction.user.findUnique({
            where: { id: actorId },
            select: { id: true },
          }),
          transaction.role.findUnique({
            where: { name: role },
            select: {
              id: true,
              permissions: {
                select: { permission: { select: { key: true } } },
              },
            },
          }),
          transaction.permission.findMany({
            where: { key: { in: nextPermissions } },
            select: { id: true, key: true },
          }),
        ]);

        if (!actor) throw new NotFoundException('Developer account not found');
        if (!targetRole) throw new NotFoundException('Role not found');
        if (configuredPermissions.length !== nextPermissions.length) {
          throw new ConflictException(
            'One or more permissions are not configured in the database',
          );
        }

        const currentPermissions = normalizePermissions(
          targetRole.permissions.map(({ permission }) => permission.key),
        );
        if (
          currentPermissions.length === nextPermissions.length &&
          currentPermissions.every(
            (permission, index) => permission === nextPermissions[index],
          )
        ) {
          throw new ConflictException('Role permissions are unchanged');
        }

        await transaction.rolePermission.deleteMany({
          where: { roleId: targetRole.id },
        });
        if (configuredPermissions.length > 0) {
          await transaction.rolePermission.createMany({
            data: configuredPermissions.map((permission) => ({
              roleId: targetRole.id,
              permissionId: permission.id,
              grantedById: actorId,
              reason: input.reason,
            })),
          });
        }

        const revokedSessions = await transaction.refreshSession.updateMany({
          where: {
            revokedAt: null,
            user: { roles: { some: { roleId: targetRole.id } } },
          },
          data: { revokedAt: new Date() },
        });

        await transaction.auditLog.create({
          data: {
            actorId,
            action: 'ROLE_PERMISSIONS_UPDATED',
            targetType: 'Role',
            targetId: role,
            beforeSummary: { permissions: currentPermissions },
            afterSummary: {
              permissions: nextPermissions,
              reason: input.reason,
              revokedSessionCount: revokedSessions.count,
            },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    return this.getMatrix();
  }
}
