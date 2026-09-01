import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  PropertyReportCategory,
  PropertyReportStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { ReportModerationAction } from './dto/moderate-property-report.dto';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;
  let propertyFindFirst: jest.MockedFunction<
    (args: Prisma.PropertyFindFirstArgs) => Promise<unknown>
  >;
  let reportCreate: jest.MockedFunction<
    (args: Prisma.PropertyReportCreateArgs) => Promise<unknown>
  >;
  let reportFindUnique: jest.MockedFunction<
    (args: Prisma.PropertyReportFindUniqueArgs) => Promise<unknown>
  >;
  let reportUpdateMany: jest.MockedFunction<
    (args: Prisma.PropertyReportUpdateManyArgs) => Promise<{ count: number }>
  >;
  let auditCreate: jest.MockedFunction<
    (args: Prisma.AuditLogCreateArgs) => Promise<unknown>
  >;

  beforeEach(() => {
    propertyFindFirst = jest.fn();
    reportCreate = jest.fn();
    reportFindUnique = jest.fn();
    reportUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
    auditCreate = jest.fn().mockResolvedValue({ id: 'audit-id' });

    const transaction = {
      propertyReport: {
        findUnique: reportFindUnique,
        updateMany: reportUpdateMany,
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      property: { findFirst: propertyFindFirst },
      propertyReport: { create: reportCreate },
      $transaction: jest.fn(
        async (work: (client: typeof transaction) => Promise<unknown>) =>
          work(transaction),
      ),
    } as unknown as PrismaService;

    service = new ReportsService(prisma);
  });

  it('accepts an anonymous report only against the approved active version', async () => {
    const createdAt = new Date('2026-09-01T00:00:00.000Z');
    propertyFindFirst.mockResolvedValue({
      id: 'property-id',
      activeVersionId: 'version-id',
    });
    reportCreate.mockResolvedValue({
      id: 'report-id',
      status: PropertyReportStatus.OPEN,
      createdAt,
    });

    const result = await service.create('property-id', {
      category: PropertyReportCategory.INCORRECT_DETAILS,
      description: 'The published opening hours are no longer correct.',
      reporterEmail: 'HELP@EXAMPLE.TEST',
    });

    expect(reportCreate).toHaveBeenCalledWith({
      data: {
        propertyId: 'property-id',
        propertyVersionId: 'version-id',
        category: PropertyReportCategory.INCORRECT_DETAILS,
        description: 'The published opening hours are no longer correct.',
        reporterEmail: 'help@example.test',
      },
      select: { id: true, status: true, createdAt: true },
    });
    expect(result).toMatchObject({
      id: 'report-id',
      status: PropertyReportStatus.OPEN,
      createdAt: createdAt.toISOString(),
    });
  });

  it('does not reveal whether an unavailable property exists', async () => {
    propertyFindFirst.mockResolvedValue(null);

    await expect(
      service.create('private-property', {
        category: PropertyReportCategory.OTHER,
        description: 'This report contains enough detail for moderation.',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(reportCreate).not.toHaveBeenCalled();
  });

  it('records a successful moderation transition and its audit event', async () => {
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      propertyId: 'property-id',
      status: PropertyReportStatus.OPEN,
      moderatorId: null,
      moderatorNote: null,
    });

    await expect(
      service.moderate('admin-id', 'report-id', {
        action: ReportModerationAction.RESOLVE,
        note: 'The owner corrected the published opening hours.',
      }),
    ).resolves.toEqual({
      id: 'report-id',
      status: PropertyReportStatus.RESOLVED,
    });
    const updateArgs = reportUpdateMany.mock.calls[0]?.[0];
    expect(updateArgs?.where).toEqual({
      id: 'report-id',
      status: PropertyReportStatus.OPEN,
    });
    expect(updateArgs?.data).toMatchObject({
      status: PropertyReportStatus.RESOLVED,
      moderatorId: 'admin-id',
    });
    const auditArgs = auditCreate.mock.calls[0]?.[0];
    expect(auditArgs?.data).toMatchObject({
      actorId: 'admin-id',
      action: 'PROPERTY_REPORT_RESOLVE',
      targetType: 'PROPERTY_REPORT',
      targetId: 'report-id',
    });
  });

  it('rejects moderation of a report that is already closed', async () => {
    reportFindUnique.mockResolvedValue({
      id: 'report-id',
      propertyId: 'property-id',
      status: PropertyReportStatus.RESOLVED,
      moderatorId: 'admin-id',
      moderatorNote: 'Already resolved.',
    });

    await expect(
      service.moderate('admin-id', 'report-id', {
        action: ReportModerationAction.DISMISS,
        note: 'Trying to change a final moderation decision.',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(reportUpdateMany).not.toHaveBeenCalled();
    expect(auditCreate).not.toHaveBeenCalled();
  });
});
