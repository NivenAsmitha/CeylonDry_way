/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  Prisma,
  PropertyStatus,
  PropertyType,
  RoleName,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import type { OwnerPropertyRecord } from './properties.mapper';
import { PropertiesService } from './properties.service';

const USER_ID = 'owner-a';
const OTHER_USER_ID = 'owner-b';
const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const PUBLISHED_VERSION_ID = '99999999-9999-4999-8999-999999999999';
const NOW = new Date('2026-08-25T00:00:00.000Z');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type PropertyUpdateManyMock = jest.MockedFunction<
  (args: Prisma.PropertyUpdateManyArgs) => Promise<{ count: number }>
>;
type PropertyVersionUpdateManyMock = jest.MockedFunction<
  (args: Prisma.PropertyVersionUpdateManyArgs) => Promise<{ count: number }>
>;
type UserRoleUpsertMock = jest.MockedFunction<
  (args: Prisma.UserRoleUpsertArgs) => Promise<unknown>
>;
type AuditLogCreateMock = jest.MockedFunction<
  (args: Prisma.AuditLogCreateArgs) => Promise<unknown>
>;

function createPropertyRecord(
  status: PropertyStatus,
  complete = true,
): OwnerPropertyRecord {
  return {
    id: PROPERTY_ID,
    lifecycleStatus: status,
    activeVersionId:
      status === PropertyStatus.DRAFT ||
      status === PropertyStatus.PENDING ||
      status === PropertyStatus.CHANGES_REQUESTED
        ? null
        : VERSION_ID,
    workingVersionId: VERSION_ID,
    createdAt: NOW,
    updatedAt: NOW,
    workingVersion: {
      id: VERSION_ID,
      version: 1,
      propertyType: complete ? PropertyType.HOTEL : null,
      name: complete ? 'Accessible Coast Hotel' : null,
      organisation: null,
      description: complete
        ? 'A detailed and accessible property description for travellers who need reliable facilities.'
        : null,
      accessNotes: complete
        ? 'Use the level entrance beside the main reception.'
        : null,
      isFree: true,
      feeLkr: null,
      phone: null,
      email: null,
      website: null,
      address: complete ? '1 Coast Road' : null,
      district: complete ? 'Galle' : null,
      city: complete ? 'Galle' : null,
      latitude: complete ? new Prisma.Decimal(6.0329) : null,
      longitude: complete ? new Prisma.Decimal(80.2168) : null,
      submittedAt: status === PropertyStatus.PENDING ? NOW : null,
      amenities: complete
        ? [
            {
              notes: null,
              amenity: {
                code: 'HANDWASHING',
                name: 'Handwashing facilities',
                isActive: true,
              },
            },
          ]
        : [],
      openingHours: [],
      photos: complete
        ? [
            {
              id: '33333333-3333-4333-8333-333333333333',
              url: 'https://images.example.test/property.jpg',
              sortOrder: 0,
              isCover: true,
              altText: 'Accessible entrance',
            },
          ]
        : [],
    },
    reviewDecisions: [],
  };
}

describe('PropertiesService', () => {
  let service: PropertiesService;
  let mainPropertyFindFirst: jest.Mock;
  let transactionPropertyFindFirst: jest.Mock;
  let transactionPropertyUpdateMany: PropertyUpdateManyMock;
  let transactionVersionUpdateMany: PropertyVersionUpdateManyMock;
  let transactionUserRoleUpsert: UserRoleUpsertMock;
  let transactionPropertyCreate: jest.Mock;
  let transactionVersionCreate: jest.Mock;
  let transactionUserFindFirst: jest.Mock;
  let transactionAuditCreate: AuditLogCreateMock;
  let transactionRunner: jest.Mock;

  beforeEach(() => {
    mainPropertyFindFirst = jest.fn();
    transactionPropertyFindFirst = jest.fn();
    transactionPropertyUpdateMany = jest.fn() as PropertyUpdateManyMock;
    transactionPropertyUpdateMany.mockResolvedValue({ count: 1 });
    transactionVersionUpdateMany = jest.fn() as PropertyVersionUpdateManyMock;
    transactionVersionUpdateMany.mockResolvedValue({ count: 1 });
    transactionUserRoleUpsert = jest.fn() as UserRoleUpsertMock;
    transactionUserRoleUpsert.mockResolvedValue({});
    transactionPropertyCreate = jest
      .fn()
      .mockResolvedValue({ id: PROPERTY_ID });
    transactionVersionCreate = jest.fn().mockResolvedValue({ id: VERSION_ID });
    transactionUserFindFirst = jest.fn().mockResolvedValue({
      id: USER_ID,
      roles: [{ role: { name: RoleName.CLIENT } }],
    });
    transactionAuditCreate = jest.fn() as AuditLogCreateMock;
    transactionAuditCreate.mockResolvedValue({ id: 'audit-id' });

    const transaction = {
      user: {
        findFirst: transactionUserFindFirst,
      },
      role: {
        findUnique: jest.fn().mockResolvedValue({ id: 'owner-role' }),
      },
      userRole: { upsert: transactionUserRoleUpsert },
      auditLog: { create: transactionAuditCreate },
      property: {
        create: transactionPropertyCreate,
        findFirst: transactionPropertyFindFirst,
        updateMany: transactionPropertyUpdateMany,
      },
      propertyVersion: {
        create: transactionVersionCreate,
        updateMany: transactionVersionUpdateMany,
      },
      amenity: { findMany: jest.fn().mockResolvedValue([]) },
      propertyAmenity: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      openingHour: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        createMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    transactionRunner = jest.fn(
      async (
        work: (transactionClient: typeof transaction) => Promise<unknown>,
      ): Promise<unknown> => work(transaction),
    );

    const prismaMock = {
      $transaction: transactionRunner,
      property: {
        findFirst: mainPropertyFindFirst,
        findMany: jest.fn(),
        count: jest.fn(),
      },
      amenity: { findMany: jest.fn() },
    };

    service = new PropertiesService(prismaMock as unknown as PrismaService);
  });

  it('creates a first DRAFT and upserts only OWNER while preserving CLIENT', async () => {
    mainPropertyFindFirst.mockResolvedValue(
      createPropertyRecord(PropertyStatus.DRAFT, false),
    );

    const result = await service.createDraft(USER_ID, {});

    expect(result.lifecycleStatus).toBe(PropertyStatus.DRAFT);
    expect(transactionPropertyCreate).toHaveBeenCalledWith({
      data: {
        ownerUserId: USER_ID,
        lifecycleStatus: PropertyStatus.DRAFT,
      },
      select: { id: true },
    });
    expect(transactionVersionCreate).toHaveBeenCalledWith({
      data: { propertyId: PROPERTY_ID, version: 1 },
      select: { id: true },
    });
    expect(transactionUserRoleUpsert).toHaveBeenCalledWith({
      where: {
        userId_roleId: { userId: USER_ID, roleId: 'owner-role' },
      },
      create: {
        userId: USER_ID,
        roleId: 'owner-role',
        systemReason: 'FIRST_PROPERTY_DRAFT',
      },
      update: {},
    });
    expect(JSON.stringify(transactionUserRoleUpsert.mock.calls)).not.toContain(
      RoleName.CLIENT,
    );
    expect(transactionAuditCreate).toHaveBeenCalledWith({
      data: {
        actorId: USER_ID,
        action: 'OWNER_ROLE_ASSIGNED',
        targetType: 'User',
        targetId: USER_ID,
        beforeSummary: { roles: [RoleName.CLIENT] },
        afterSummary: {
          roles: [RoleName.CLIENT, RoleName.OWNER],
          reason: 'FIRST_PROPERTY_DRAFT',
        },
      },
    });
  });

  it('uses the same composite OWNER upsert for subsequent drafts', async () => {
    mainPropertyFindFirst.mockResolvedValue(
      createPropertyRecord(PropertyStatus.DRAFT, false),
    );

    await service.createDraft(USER_ID, {});
    await service.createDraft(USER_ID, {});

    expect(transactionUserRoleUpsert).toHaveBeenCalledTimes(2);
    expect(
      transactionUserRoleUpsert.mock.calls.map((call) => call[0].where),
    ).toEqual([
      { userId_roleId: { userId: USER_ID, roleId: 'owner-role' } },
      { userId_roleId: { userId: USER_ID, roleId: 'owner-role' } },
    ]);
  });

  it('accepts an existing CLIENT + OWNER without duplicating either role', async () => {
    transactionUserFindFirst.mockResolvedValue({
      id: USER_ID,
      roles: [
        { role: { name: RoleName.OWNER } },
        { role: { name: RoleName.CLIENT } },
      ],
    });
    mainPropertyFindFirst.mockResolvedValue(
      createPropertyRecord(PropertyStatus.DRAFT, false),
    );

    await service.createDraft(USER_ID, {});

    expect(transactionUserRoleUpsert).toHaveBeenCalledTimes(1);
  });

  it.each([RoleName.REVIEWER, RoleName.ADMIN, RoleName.DEVELOPER])(
    'does not let a %s-only staff account gain OWNER through draft creation',
    async (role) => {
      transactionUserFindFirst.mockResolvedValue({
        id: USER_ID,
        roles: [{ role: { name: role } }],
      });

      await expect(service.createDraft(USER_ID, {})).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(transactionPropertyCreate).not.toHaveBeenCalled();
      expect(transactionUserRoleUpsert).not.toHaveBeenCalled();
    },
  );

  it('does not disclose another owner property on read', async () => {
    mainPropertyFindFirst.mockResolvedValue(null);

    await expect(
      service.getOwnedProperty(OTHER_USER_ID, PROPERTY_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(mainPropertyFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: PROPERTY_ID,
          ownerUserId: OTHER_USER_ID,
          lifecycleStatus: { not: PropertyStatus.ARCHIVED },
        },
      }),
    );
  });

  it('does not mutate another owner property', async () => {
    transactionPropertyFindFirst.mockResolvedValue(null);

    await expect(
      service.updateOwnedProperty(OTHER_USER_ID, PROPERTY_ID, {
        name: 'Forbidden update',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionVersionUpdateMany).not.toHaveBeenCalled();
    expect(transactionPropertyUpdateMany).not.toHaveBeenCalled();
  });

  it('clones an approved version into a private working revision without replacing the published version', async () => {
    transactionPropertyFindFirst.mockResolvedValue({
      id: PROPERTY_ID,
      lifecycleStatus: PropertyStatus.APPROVED,
      activeVersionId: PUBLISHED_VERSION_ID,
      workingVersionId: PUBLISHED_VERSION_ID,
      activeVersion: {
        id: PUBLISHED_VERSION_ID,
        propertyType: PropertyType.HOTEL,
        name: 'Published property',
        organisation: null,
        description: 'A complete published property description.',
        accessNotes: 'Use the front entrance.',
        isFree: true,
        feeLkr: null,
        phone: null,
        email: null,
        website: null,
        address: '1 Coast Road',
        district: 'Galle',
        city: 'Galle',
        latitude: new Prisma.Decimal(6.0329),
        longitude: new Prisma.Decimal(80.2168),
        amenities: [{ amenityId: 'amenity-1', notes: null }],
        openingHours: [],
        photos: [
          {
            url: 'https://images.example.test/property.jpg',
            storageKey: 'property.jpg',
            sortOrder: 0,
            isCover: true,
            altText: 'Published entrance',
          },
        ],
      },
      versions: [{ version: 1 }],
    });
    transactionVersionCreate.mockResolvedValueOnce({
      id: VERSION_ID,
      version: 2,
    });
    const response = createPropertyRecord(PropertyStatus.APPROVED);
    response.activeVersionId = PUBLISHED_VERSION_ID;
    response.workingVersionId = VERSION_ID;
    mainPropertyFindFirst.mockResolvedValue(response);

    const result = await service.startOwnedPropertyRevision(
      USER_ID,
      PROPERTY_ID,
    );

    expect(transactionPropertyUpdateMany).toHaveBeenCalledWith({
      where: {
        id: PROPERTY_ID,
        ownerUserId: USER_ID,
        lifecycleStatus: PropertyStatus.APPROVED,
        activeVersionId: PUBLISHED_VERSION_ID,
        workingVersionId: PUBLISHED_VERSION_ID,
      },
      data: { workingVersionId: VERSION_ID, updatedAt: expect.any(Date) },
    });
    expect(transactionAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: USER_ID,
          action: 'PROPERTY_REVISION_STARTED',
          targetId: PROPERTY_ID,
          beforeSummary: expect.objectContaining({
            activeVersionId: PUBLISHED_VERSION_ID,
          }),
          afterSummary: expect.objectContaining({
            activeVersionId: PUBLISHED_VERSION_ID,
            workingVersionId: VERSION_ID,
            version: 2,
          }),
        }),
      }),
    );
    expect(result.canEdit).toBe(true);
    expect(result.canStartRevision).toBe(false);
  });

  it('updates a DRAFT using owner-scoped version and property conditions', async () => {
    transactionPropertyFindFirst.mockResolvedValue({
      id: PROPERTY_ID,
      lifecycleStatus: PropertyStatus.DRAFT,
      activeVersionId: null,
      workingVersionId: VERSION_ID,
    });
    mainPropertyFindFirst.mockResolvedValue(
      createPropertyRecord(PropertyStatus.DRAFT),
    );

    await service.updateOwnedProperty(USER_ID, PROPERTY_ID, {
      name: 'Updated property',
    });

    expect(transactionVersionUpdateMany).toHaveBeenCalledWith({
      where: {
        id: VERSION_ID,
        property: { id: PROPERTY_ID, ownerUserId: USER_ID },
      },
      data: { name: 'Updated property' },
    });
    expect(transactionPropertyUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: PROPERTY_ID,
          ownerUserId: USER_ID,
          lifecycleStatus: PropertyStatus.DRAFT,
        },
      }),
    );
  });

  it('rejects submission of an incomplete DRAFT with structured fields', async () => {
    transactionPropertyFindFirst.mockResolvedValue(
      createPropertyRecord(PropertyStatus.DRAFT, false),
    );

    let submissionError: unknown;
    try {
      await service.submitOwnedProperty(USER_ID, PROPERTY_ID, {
        confirm: true,
      });
    } catch (error: unknown) {
      submissionError = error;
    }

    expect(submissionError).toBeInstanceOf(UnprocessableEntityException);
    if (!(submissionError instanceof UnprocessableEntityException)) {
      throw new Error('Expected incomplete submission to be rejected');
    }
    const response: unknown = submissionError.getResponse();
    expect(isRecord(response) ? response.code : undefined).toBe(
      'PROPERTY_SUBMISSION_INVALID',
    );
    const details = isRecord(response) ? response.details : undefined;
    const detailFields = Array.isArray(details)
      ? details.flatMap((detail: unknown) =>
          isRecord(detail) && typeof detail.field === 'string'
            ? [detail.field]
            : [],
        )
      : [];
    expect(detailFields).toEqual(
      expect.arrayContaining([
        'name',
        'propertyType',
        'amenityCodes',
        'photos',
      ]),
    );
    expect(transactionVersionUpdateMany).not.toHaveBeenCalled();
    expect(transactionPropertyUpdateMany).not.toHaveBeenCalled();
  });

  it.each([PropertyStatus.DRAFT, PropertyStatus.CHANGES_REQUESTED])(
    'atomically submits a valid %s property as PENDING',
    async (editableStatus) => {
      transactionPropertyFindFirst.mockResolvedValue(
        createPropertyRecord(editableStatus),
      );
      mainPropertyFindFirst.mockResolvedValue(
        createPropertyRecord(PropertyStatus.PENDING),
      );

      const result = await service.submitOwnedProperty(USER_ID, PROPERTY_ID, {
        confirm: true,
      });

      expect(result.lifecycleStatus).toBe(PropertyStatus.PENDING);
      expect(result.canEdit).toBe(false);
      const versionUpdate = transactionVersionUpdateMany.mock.calls[0]?.[0];
      expect(versionUpdate?.where).toEqual({
        id: VERSION_ID,
        property: { id: PROPERTY_ID, ownerUserId: USER_ID },
      });
      const submittedAt = versionUpdate?.data.submittedAt;
      expect(submittedAt).toBeInstanceOf(Date);

      const propertyUpdate = transactionPropertyUpdateMany.mock.calls[0]?.[0];
      expect(propertyUpdate?.where).toEqual({
        id: PROPERTY_ID,
        ownerUserId: USER_ID,
        lifecycleStatus: editableStatus,
        workingVersionId: VERSION_ID,
      });
      expect(propertyUpdate?.data.lifecycleStatus).toBe(PropertyStatus.PENDING);
    },
  );

  it.each([PropertyStatus.APPROVED, PropertyStatus.UPDATE_CHANGES_REQUESTED])(
    'submits a private %s revision as PENDING_UPDATE',
    async (status) => {
      const revision = createPropertyRecord(status);
      revision.activeVersionId = PUBLISHED_VERSION_ID;
      revision.workingVersionId = VERSION_ID;
      transactionPropertyFindFirst.mockResolvedValue(revision);
      const pending = createPropertyRecord(PropertyStatus.PENDING_UPDATE);
      pending.activeVersionId = PUBLISHED_VERSION_ID;
      pending.workingVersionId = VERSION_ID;
      mainPropertyFindFirst.mockResolvedValue(pending);

      const result = await service.submitOwnedProperty(USER_ID, PROPERTY_ID, {
        confirm: true,
      });

      expect(transactionPropertyUpdateMany).toHaveBeenCalledWith({
        where: {
          id: PROPERTY_ID,
          ownerUserId: USER_ID,
          lifecycleStatus: status,
          workingVersionId: VERSION_ID,
        },
        data: {
          lifecycleStatus: PropertyStatus.PENDING_UPDATE,
          updatedAt: expect.any(Date),
        },
      });
      expect(result.lifecycleStatus).toBe(PropertyStatus.PENDING_UPDATE);
    },
  );

  it('rejects an otherwise complete submission that has no photo', async () => {
    const property = createPropertyRecord(PropertyStatus.DRAFT);
    property.workingVersion!.photos = [];
    transactionPropertyFindFirst.mockResolvedValue(property);

    let submissionError: unknown;
    try {
      await service.submitOwnedProperty(USER_ID, PROPERTY_ID, {
        confirm: true,
      });
    } catch (error: unknown) {
      submissionError = error;
    }

    expect(submissionError).toBeInstanceOf(UnprocessableEntityException);
    if (!(submissionError instanceof UnprocessableEntityException)) {
      throw new Error('Expected photo-less submission to be rejected');
    }
    const response = submissionError.getResponse();
    const details = isRecord(response) ? response.details : undefined;
    expect(details).toEqual([
      { field: 'photos', message: 'Add at least one property photo' },
    ]);
    expect(transactionVersionUpdateMany).not.toHaveBeenCalled();
  });

  it.each([
    PropertyStatus.PENDING,
    PropertyStatus.PENDING_UPDATE,
    PropertyStatus.REJECTED,
    PropertyStatus.SUSPENDED,
    PropertyStatus.ARCHIVED,
  ])('denies owner edits while status is %s', async (status) => {
    transactionPropertyFindFirst.mockResolvedValue({
      id: PROPERTY_ID,
      lifecycleStatus: status,
      activeVersionId: VERSION_ID,
      workingVersionId: VERSION_ID,
    });

    await expect(
      service.updateOwnedProperty(USER_ID, PROPERTY_ID, { name: 'Denied' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transactionVersionUpdateMany).not.toHaveBeenCalled();
  });

  it('soft-removes an owned property and records the original status', async () => {
    transactionPropertyFindFirst.mockResolvedValue({
      id: PROPERTY_ID,
      lifecycleStatus: PropertyStatus.APPROVED,
      activeVersionId: VERSION_ID,
      workingVersionId: VERSION_ID,
    });

    await service.archiveOwnedProperty(USER_ID, PROPERTY_ID);

    expect(transactionPropertyUpdateMany).toHaveBeenCalledWith({
      where: {
        id: PROPERTY_ID,
        ownerUserId: USER_ID,
        lifecycleStatus: PropertyStatus.APPROVED,
      },
      data: { lifecycleStatus: PropertyStatus.ARCHIVED },
    });
    const auditCall: unknown = transactionAuditCreate.mock.calls[0]?.[0];
    const auditData =
      isRecord(auditCall) && isRecord(auditCall.data)
        ? auditCall.data
        : undefined;
    expect(auditData?.actorId).toBe(USER_ID);
    expect(auditData?.action).toBe('OWNER_PROPERTY_REMOVED');
    expect(auditData?.targetId).toBe(PROPERTY_ID);
    expect(auditData?.beforeSummary).toEqual({
      lifecycleStatus: PropertyStatus.APPROVED,
      activeVersionId: VERSION_ID,
    });
    expect(auditData?.afterSummary).toEqual({
      lifecycleStatus: PropertyStatus.ARCHIVED,
    });
  });

  it('does not reveal whether another owner property exists during deletion', async () => {
    transactionPropertyFindFirst.mockResolvedValue(null);

    await expect(
      service.archiveOwnedProperty(OTHER_USER_ID, PROPERTY_ID),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(transactionPropertyUpdateMany).not.toHaveBeenCalled();
  });

  it('maps only the active owner-safe version without private version history', async () => {
    mainPropertyFindFirst.mockResolvedValue(
      createPropertyRecord(PropertyStatus.DRAFT),
    );

    const result = await service.getOwnedProperty(USER_ID, PROPERTY_ID);

    expect(result).not.toHaveProperty('ownerUserId');
    expect(result).not.toHaveProperty('versions');
    expect(result.activeVersion.photos).toEqual([
      {
        id: '33333333-3333-4333-8333-333333333333',
        url: 'https://images.example.test/property.jpg',
        sortOrder: 0,
        isCover: true,
        altText: 'Accessible entrance',
      },
    ]);
    expect(result.activeVersion.photos[0]).not.toHaveProperty('storageKey');
  });
});
