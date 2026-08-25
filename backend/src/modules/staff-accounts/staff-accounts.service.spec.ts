import { ConflictException, ForbiddenException } from '@nestjs/common';
import { verify as verifyPassword } from 'argon2';
import { Prisma, RoleName, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffAccountsService } from './staff-accounts.service';

const ACTOR_ID = 'actor-user';
const CREATED_ID = 'created-user';
const TEMPORARY_PASSWORD = 'Temporary-Staff-Password-123!';
const createdAt = new Date('2026-08-25T00:00:00.000Z');

function roleRecords(roles: readonly RoleName[]) {
  return roles.map((name) => ({ role: { name } }));
}

describe('StaffAccountsService', () => {
  let service: StaffAccountsService;
  let actorRoles: RoleName[];
  let actorEmail: string;
  let existingUser: { id: string } | null;
  let userCreate: jest.MockedFunction<
    (args: Prisma.UserCreateArgs) => Promise<unknown>
  >;
  let auditCreate: jest.MockedFunction<
    (args: Prisma.AuditLogCreateArgs) => Promise<unknown>
  >;

  beforeEach(() => {
    actorRoles = [RoleName.ADMIN];
    actorEmail = 'actor@example.test';
    existingUser = null;
    userCreate = jest.fn();
    auditCreate = jest.fn().mockResolvedValue({ id: 'audit-id' });

    const findActorOrTarget = jest.fn(
      (args: Prisma.UserFindUniqueArgs): Promise<unknown> => {
        const where: unknown = args.where;
        if (
          typeof where === 'object' &&
          where !== null &&
          'id' in where &&
          where.id === ACTOR_ID
        ) {
          return Promise.resolve({
            id: ACTOR_ID,
            email: actorEmail,
            roles: roleRecords(actorRoles),
          });
        }
        return Promise.resolve(existingUser);
      },
    );
    const transaction = {
      user: {
        findUnique: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: ACTOR_ID,
            roles: roleRecords(actorRoles),
          }),
        ),
        create: userCreate,
      },
      auditLog: { create: auditCreate },
    };
    const prisma = {
      user: { findUnique: findActorOrTarget },
      role: {
        findUnique: jest
          .fn()
          .mockImplementation((args: Prisma.RoleFindUniqueArgs) =>
            Promise.resolve({
              id: `${String(args.where.name).toLowerCase()}-role`,
            }),
          ),
      },
      $transaction: jest.fn(
        async (work: (client: typeof transaction) => Promise<unknown>) =>
          work(transaction),
      ),
    } as unknown as PrismaService;
    service = new StaffAccountsService(prisma);
  });

  function mockCreatedUser(role: RoleName): { getHash: () => string } {
    let passwordHash = '';
    userCreate.mockImplementation((args: Prisma.UserCreateArgs) => {
      const hash: unknown = args.data.passwordHash;
      if (typeof hash !== 'string') throw new Error('Expected password hash');
      passwordHash = hash;
      return Promise.resolve({
        id: CREATED_ID,
        email: 'new-staff@example.test',
        name: 'New Staff',
        phone: null,
        language: 'en',
        status: UserStatus.ACTIVE,
        createdAt,
        roles: roleRecords([role]),
      });
    });
    return { getHash: () => passwordHash };
  }

  it('lets ADMIN create REVIEWER only with Argon2id and an audit record', async () => {
    const stored = mockCreatedUser(RoleName.REVIEWER);

    const result = await service.createReviewer(ACTOR_ID, {
      name: 'New Staff',
      email: ' NEW-STAFF@EXAMPLE.TEST ',
      temporaryPassword: TEMPORARY_PASSWORD,
    });

    expect(result.roles).toEqual([RoleName.REVIEWER]);
    expect(result).not.toHaveProperty('passwordHash');
    expect(stored.getHash()).toMatch(/^\$argon2id\$/);
    await expect(
      verifyPassword(stored.getHash(), TEMPORARY_PASSWORD),
    ).resolves.toBe(true);
    const createArgs = userCreate.mock.calls[0]?.[0];
    expect(createArgs?.data).toMatchObject({
      email: 'new-staff@example.test',
      roles: {
        create: {
          assignedBy: { connect: { id: ACTOR_ID } },
          systemReason: 'PRIVILEGED_ACCOUNT_CREATION',
        },
      },
    });
    expect(JSON.stringify(userCreate.mock.calls)).not.toContain(
      RoleName.CLIENT,
    );
    expect(auditCreate).toHaveBeenCalledWith({
      data: {
        actorId: ACTOR_ID,
        action: 'REVIEWER_ACCOUNT_CREATED',
        targetType: 'User',
        targetId: CREATED_ID,
        afterSummary: { roles: [RoleName.REVIEWER] },
      },
    });
  });

  it('lets DEVELOPER create ADMIN only without assigning CLIENT', async () => {
    actorRoles = [RoleName.DEVELOPER];
    mockCreatedUser(RoleName.ADMIN);

    const result = await service.createAdmin(ACTOR_ID, {
      name: 'New Admin',
      email: 'admin@example.test',
      temporaryPassword: TEMPORARY_PASSWORD,
    });

    expect(result.roles).toEqual([RoleName.ADMIN]);
    expect(JSON.stringify(userCreate.mock.calls)).not.toContain(
      RoleName.CLIENT,
    );
    expect(auditCreate.mock.calls[0]?.[0].data).toMatchObject({
      action: 'ADMIN_ACCOUNT_CREATED',
    });
  });

  it.each([
    {
      actor: [RoleName.REVIEWER],
      operation: 'reviewer' as const,
    },
    { actor: [RoleName.ADMIN], operation: 'admin' as const },
    { actor: [RoleName.REVIEWER], operation: 'admin' as const },
    {
      actor: [RoleName.CLIENT, RoleName.ADMIN],
      operation: 'reviewer' as const,
    },
  ])(
    'rejects unauthorized or invalid actor role sets: $actor',
    async (test) => {
      actorRoles = test.actor;
      const operation =
        test.operation === 'reviewer'
          ? service.createReviewer(ACTOR_ID, {
              name: 'New Staff',
              email: 'new@example.test',
              temporaryPassword: TEMPORARY_PASSWORD,
            })
          : service.createAdmin(ACTOR_ID, {
              name: 'New Admin',
              email: 'new@example.test',
              temporaryPassword: TEMPORARY_PASSWORD,
            });

      await expect(operation).rejects.toBeInstanceOf(ForbiddenException);
      expect(userCreate).not.toHaveBeenCalled();
    },
  );

  it('prevents provisioning the caller account', async () => {
    await expect(
      service.createReviewer(ACTOR_ID, {
        name: 'Actor',
        email: actorEmail,
        temporaryPassword: TEMPORARY_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('fails safely when the normalized email already exists', async () => {
    existingUser = { id: 'existing' };

    await expect(
      service.createReviewer(ACTOR_ID, {
        name: 'Existing Staff',
        email: 'existing@example.test',
        temporaryPassword: TEMPORARY_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(userCreate).not.toHaveBeenCalled();
  });
});
