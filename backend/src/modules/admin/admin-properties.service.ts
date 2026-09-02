import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  PropertyStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AdminPropertyAction,
  type AdminPropertyActionDto,
} from './dto/admin-property-action.dto';
import type { AdminPropertyQueryDto } from './dto/admin-property-query.dto';

const actionStatus: Readonly<
  Record<
    AdminPropertyAction,
    { from: readonly PropertyStatus[]; to: PropertyStatus }
  >
> = {
  [AdminPropertyAction.SUSPEND]: {
    from: [
      PropertyStatus.APPROVED,
      PropertyStatus.PENDING_UPDATE,
      PropertyStatus.UPDATE_CHANGES_REQUESTED,
    ],
    to: PropertyStatus.SUSPENDED,
  },
  [AdminPropertyAction.REACTIVATE]: {
    from: [PropertyStatus.SUSPENDED],
    to: PropertyStatus.APPROVED,
  },
  [AdminPropertyAction.ARCHIVE]: {
    from: [
      PropertyStatus.DRAFT,
      PropertyStatus.PENDING,
      PropertyStatus.CHANGES_REQUESTED,
      PropertyStatus.APPROVED,
      PropertyStatus.PENDING_UPDATE,
      PropertyStatus.UPDATE_CHANGES_REQUESTED,
      PropertyStatus.REJECTED,
      PropertyStatus.SUSPENDED,
    ],
    to: PropertyStatus.ARCHIVED,
  },
};

function allowedActions(status: PropertyStatus): AdminPropertyAction[] {
  return Object.entries(actionStatus)
    .filter(([, transition]) => transition.from.includes(status))
    .map(([action]) => action as AdminPropertyAction);
}

@Injectable()
export class AdminPropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminPropertyQueryDto) {
    const where: Prisma.PropertyWhereInput = {
      ...(query.status ? { lifecycleStatus: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              {
                activeVersion: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                activeVersion: {
                  city: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                activeVersion: {
                  district: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                owner: {
                  name: { contains: query.search, mode: 'insensitive' },
                },
              },
              {
                owner: {
                  email: { contains: query.search, mode: 'insensitive' },
                },
              },
            ],
          }
        : {}),
    };
    const properties = await this.prisma.property.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }],
      take: 200,
      select: {
        id: true,
        lifecycleStatus: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { id: true, name: true, email: true } },
        activeVersion: {
          select: {
            id: true,
            name: true,
            propertyType: true,
            city: true,
            district: true,
            photos: { select: { id: true } },
          },
        },
      },
    });

    return {
      items: properties.map((property) => ({
        id: property.id,
        lifecycleStatus: property.lifecycleStatus,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString(),
        owner: property.owner,
        activeVersion: property.activeVersion
          ? {
              id: property.activeVersion.id,
              name: property.activeVersion.name,
              propertyType: property.activeVersion.propertyType,
              city: property.activeVersion.city,
              district: property.activeVersion.district,
              photoCount: property.activeVersion.photos.length,
            }
          : null,
        allowedActions: allowedActions(property.lifecycleStatus),
      })),
      total: properties.length,
      limited: properties.length === 200,
    };
  }

  async applyAction(
    actorId: string,
    propertyId: string,
    input: AdminPropertyActionDto,
  ) {
    const transition = actionStatus[input.action];
    await this.prisma.$transaction(async (transaction) => {
      const property = await transaction.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          ownerUserId: true,
          lifecycleStatus: true,
          activeVersionId: true,
        },
      });
      if (!property) throw new NotFoundException('Property not found');
      if (!transition.from.includes(property.lifecycleStatus)) {
        throw new ConflictException(
          `Action ${input.action} is not valid for status ${property.lifecycleStatus}`,
        );
      }
      if (
        input.action === AdminPropertyAction.REACTIVATE &&
        !property.activeVersionId
      ) {
        throw new ConflictException(
          'An active version is required for reactivation',
        );
      }

      const updated = await transaction.property.updateMany({
        where: { id: property.id, lifecycleStatus: property.lifecycleStatus },
        data: { lifecycleStatus: transition.to },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Property status changed before the action completed',
        );
      }
      await transaction.auditLog.create({
        data: {
          actorId,
          action: `ADMIN_PROPERTY_${input.action}`,
          targetType: 'PROPERTY',
          targetId: property.id,
          beforeSummary: { lifecycleStatus: property.lifecycleStatus },
          afterSummary: {
            lifecycleStatus: transition.to,
            reason: input.reason,
          },
        },
      });
      if (input.action !== AdminPropertyAction.ARCHIVE) {
        await transaction.notification.create({
          data: {
            recipientId: property.ownerUserId,
            type:
              input.action === AdminPropertyAction.SUSPEND
                ? NotificationType.PROPERTY_SUSPENDED
                : NotificationType.PROPERTY_REACTIVATED,
            payload: {
              propertyId: property.id,
              lifecycleStatus: transition.to,
              reason: input.reason,
              source: 'ADMIN',
            },
          },
        });
      }
    });

    return { propertyId, lifecycleStatus: transition.to };
  }
}
