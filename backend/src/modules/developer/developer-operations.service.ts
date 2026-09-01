import { Injectable } from '@nestjs/common';
import {
  Prisma,
  PropertyReportStatus,
  PropertyStatus,
  UserStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditLogQueryDto } from './dto/audit-log-query.dto';

const serviceStartedAt = new Date();

@Injectable()
export class DeveloperOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async health() {
    const databaseCheckStartedAt = Date.now();
    await this.prisma.role.count();
    const databaseLatencyMs = Date.now() - databaseCheckStartedAt;
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      activeUsers,
      activeSessions,
      userTotal,
      propertyTotal,
      propertyGroups,
      reportGroups,
      auditEventsLast24Hours,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { status: UserStatus.ACTIVE, deletedAt: null },
      }),
      this.prisma.refreshSession.count({
        where: { revokedAt: null, expiresAt: { gt: now } },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.property.count(),
      this.prisma.property.groupBy({
        by: ['lifecycleStatus'],
        _count: { _all: true },
      }),
      this.prisma.propertyReport.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    ]);

    const propertiesByStatus = Object.values(PropertyStatus).reduce(
      (counts, status) => ({ ...counts, [status]: 0 }),
      {} as Record<PropertyStatus, number>,
    );
    for (const group of propertyGroups) {
      propertiesByStatus[group.lifecycleStatus] = group._count._all;
    }

    const reportsByStatus = Object.values(PropertyReportStatus).reduce(
      (counts, status) => ({ ...counts, [status]: 0 }),
      {} as Record<PropertyReportStatus, number>,
    );
    for (const group of reportGroups) {
      reportsByStatus[group.status] = group._count._all;
    }

    return {
      status: 'operational' as const,
      service: 'comfortgo-api',
      checkedAt: now.toISOString(),
      serviceStartedAt: serviceStartedAt.toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      runtime: { node: process.version },
      database: { status: 'connected' as const, latencyMs: databaseLatencyMs },
      metrics: {
        users: { total: userTotal, active: activeUsers },
        activeSessions,
        properties: { total: propertyTotal, byStatus: propertiesByStatus },
        reports: { byStatus: reportsByStatus },
        auditEventsLast24Hours,
      },
    };
  }

  async auditLogs(query: AuditLogQueryDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.action
        ? { action: { contains: query.action, mode: 'insensitive' } }
        : {}),
      ...(query.targetType
        ? { targetType: { contains: query.targetType, mode: 'insensitive' } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { action: { contains: query.search, mode: 'insensitive' } },
              { targetType: { contains: query.search, mode: 'insensitive' } },
              { targetId: { contains: query.search, mode: 'insensitive' } },
              {
                actor: {
                  is: { name: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                actor: {
                  is: {
                    email: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: {
          id: true,
          action: true,
          targetType: true,
          targetId: true,
          beforeSummary: true,
          afterSummary: true,
          createdAt: true,
          actor: { select: { id: true, name: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}
