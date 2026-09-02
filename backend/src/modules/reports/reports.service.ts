import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PropertyReportStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { publicEligibilityWhere } from '../properties/public-eligibility';
import type { AdminReportQueryDto } from './dto/admin-report-query.dto';
import type { CreatePropertyReportDto } from './dto/create-property-report.dto';
import {
  ReportModerationAction,
  type ModeratePropertyReportDto,
} from './dto/moderate-property-report.dto';

const actionStatus: Readonly<
  Record<ReportModerationAction, PropertyReportStatus>
> = {
  [ReportModerationAction.START_REVIEW]: PropertyReportStatus.IN_REVIEW,
  [ReportModerationAction.RESOLVE]: PropertyReportStatus.RESOLVED,
  [ReportModerationAction.DISMISS]: PropertyReportStatus.DISMISSED,
};

function allowedActions(
  status: PropertyReportStatus,
): ReportModerationAction[] {
  if (status === PropertyReportStatus.OPEN) {
    return [
      ReportModerationAction.START_REVIEW,
      ReportModerationAction.RESOLVE,
      ReportModerationAction.DISMISS,
    ];
  }
  if (status === PropertyReportStatus.IN_REVIEW) {
    return [ReportModerationAction.RESOLVE, ReportModerationAction.DISMISS];
  }
  return [];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(propertyId: string, input: CreatePropertyReportDto) {
    const property = await this.prisma.property.findFirst({
      where: {
        id: propertyId,
        ...publicEligibilityWhere,
      },
      select: { id: true, activeVersionId: true },
    });

    if (!property?.activeVersionId) {
      throw new NotFoundException('Place not found');
    }

    const report = await this.prisma.propertyReport.create({
      data: {
        propertyId: property.id,
        propertyVersionId: property.activeVersionId,
        category: input.category,
        description: input.description,
        reporterEmail: input.reporterEmail?.toLowerCase() ?? null,
      },
      select: { id: true, status: true, createdAt: true },
    });

    return {
      id: report.id,
      status: report.status,
      createdAt: report.createdAt.toISOString(),
      message: 'Thank you. The report has been sent to the moderation team.',
    };
  }

  async list(query: AdminReportQueryDto) {
    const where: Prisma.PropertyReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? {
            OR: [
              { description: { contains: query.search, mode: 'insensitive' } },
              {
                propertyVersion: {
                  is: { name: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                propertyVersion: {
                  is: { city: { contains: query.search, mode: 'insensitive' } },
                },
              },
              {
                property: {
                  is: {
                    owner: {
                      is: {
                        email: { contains: query.search, mode: 'insensitive' },
                      },
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [items, total, grouped] = await Promise.all([
      this.prisma.propertyReport.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: query.pageSize,
        select: {
          id: true,
          category: true,
          description: true,
          reporterEmail: true,
          status: true,
          moderatorNote: true,
          createdAt: true,
          updatedAt: true,
          property: {
            select: {
              id: true,
              lifecycleStatus: true,
              owner: { select: { id: true, name: true, email: true } },
            },
          },
          propertyVersion: {
            select: { id: true, name: true, city: true, district: true },
          },
          moderator: { select: { id: true, name: true } },
        },
      }),
      this.prisma.propertyReport.count({ where }),
      this.prisma.propertyReport.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const summary = Object.values(PropertyReportStatus).reduce(
      (counts, status) => ({ ...counts, [status]: 0 }),
      {} as Record<PropertyReportStatus, number>,
    );
    for (const group of grouped) summary[group.status] = group._count._all;

    return {
      items: items.map((report) => ({
        ...report,
        createdAt: report.createdAt.toISOString(),
        updatedAt: report.updatedAt.toISOString(),
        allowedActions: allowedActions(report.status),
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
      summary,
    };
  }

  async moderate(
    actorId: string,
    reportId: string,
    input: ModeratePropertyReportDto,
  ) {
    const note = input.note?.trim() || null;
    if (
      input.action !== ReportModerationAction.START_REVIEW &&
      (!note || note.length < 10)
    ) {
      throw new BadRequestException(
        'A moderation note of at least 10 characters is required',
      );
    }
    const nextStatus = actionStatus[input.action];

    return this.prisma.$transaction(async (transaction) => {
      const report = await transaction.propertyReport.findUnique({
        where: { id: reportId },
        select: {
          id: true,
          propertyId: true,
          status: true,
          moderatorId: true,
          moderatorNote: true,
        },
      });
      if (!report) throw new NotFoundException('Report not found');
      if (!allowedActions(report.status).includes(input.action)) {
        throw new ConflictException(
          `Action ${input.action} is not valid for status ${report.status}`,
        );
      }

      const updated = await transaction.propertyReport.updateMany({
        where: { id: report.id, status: report.status },
        data: {
          status: nextStatus,
          moderatorId: actorId,
          moderatorNote: note,
          resolvedAt:
            nextStatus === PropertyReportStatus.RESOLVED ||
            nextStatus === PropertyReportStatus.DISMISSED
              ? new Date()
              : null,
        },
      });
      if (updated.count !== 1) {
        throw new ConflictException(
          'Report status changed before the action completed',
        );
      }

      await transaction.auditLog.create({
        data: {
          actorId,
          action: `PROPERTY_REPORT_${input.action}`,
          targetType: 'PROPERTY_REPORT',
          targetId: report.id,
          beforeSummary: {
            status: report.status,
            moderatorId: report.moderatorId,
            moderatorNote: report.moderatorNote,
          },
          afterSummary: {
            status: nextStatus,
            propertyId: report.propertyId,
            moderatorId: actorId,
            moderatorNote: note,
          },
        },
      });

      return { id: report.id, status: nextStatus };
    });
  }
}
