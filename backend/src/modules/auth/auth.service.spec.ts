import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import {
  argon2id,
  hash as hashPassword,
  verify as verifyPassword,
} from 'argon2';
import { createHash } from 'node:crypto';
import { Prisma, RoleName, UserStatus } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { RolesService } from '../roles/roles.service';
import {
  INVALID_CREDENTIALS_MESSAGE,
  INVALID_REFRESH_MESSAGE,
} from './auth.constants';
import { AuthService } from './auth.service';

const ACCESS_SECRET = 'unit-access-secret-that-is-longer-than-32-characters';
const REFRESH_SECRET = 'unit-refresh-secret-that-is-longer-than-32-characters';
const TEST_PASSWORD = 'VeryStrongPass123!';

const safeUser = {
  id: 'user-1',
  email: 'person@example.com',
  name: 'Test Person',
  phone: null,
  language: 'en',
  status: UserStatus.ACTIVE,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  roles: [{ role: { name: RoleName.CLIENT } }],
};

interface StoredSession {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

type TestTransaction = {
  user: {
    create: jest.MockedFunction<
      (args: Prisma.UserCreateArgs) => Promise<unknown>
    >;
  };
  refreshSession: {
    findUnique: jest.MockedFunction<
      (args: Prisma.RefreshSessionFindUniqueArgs) => Promise<unknown>
    >;
    updateMany: jest.MockedFunction<
      (args: Prisma.RefreshSessionUpdateManyArgs) => Promise<{ count: number }>
    >;
    create: jest.MockedFunction<
      (args: Prisma.RefreshSessionCreateArgs) => Promise<unknown>
    >;
  };
};

function readStoredSession(
  args: Prisma.RefreshSessionCreateArgs,
): StoredSession {
  const data: unknown = args.data;

  if (
    typeof data !== 'object' ||
    data === null ||
    !('id' in data) ||
    typeof data.id !== 'string' ||
    !('userId' in data) ||
    typeof data.userId !== 'string' ||
    !('tokenHash' in data) ||
    typeof data.tokenHash !== 'string' ||
    !('familyId' in data) ||
    typeof data.familyId !== 'string' ||
    !('expiresAt' in data) ||
    !(data.expiresAt instanceof Date)
  ) {
    throw new Error('Test received invalid refresh-session data');
  }

  return {
    id: data.id,
    userId: data.userId,
    tokenHash: data.tokenHash,
    familyId: data.familyId,
    expiresAt: data.expiresAt,
    ...('userAgent' in data && typeof data.userAgent === 'string'
      ? { userAgent: data.userAgent }
      : {}),
    ...('ipAddress' in data && typeof data.ipAddress === 'string'
      ? { ipAddress: data.ipAddress }
      : {}),
  };
}

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let userFindUnique: jest.MockedFunction<
    (args: Prisma.UserFindUniqueArgs) => Promise<unknown>
  >;
  let refreshSessionFindUnique: jest.MockedFunction<
    (args: Prisma.RefreshSessionFindUniqueArgs) => Promise<unknown>
  >;
  let refreshSessionUpdateMany: jest.MockedFunction<
    (args: Prisma.RefreshSessionUpdateManyArgs) => Promise<{ count: number }>
  >;
  let refreshSessionCreate: jest.MockedFunction<
    (args: Prisma.RefreshSessionCreateArgs) => Promise<unknown>
  >;
  let transactionUserCreate: TestTransaction['user']['create'];
  let transactionRefreshFindUnique: TestTransaction['refreshSession']['findUnique'];
  let transactionRefreshUpdateMany: TestTransaction['refreshSession']['updateMany'];
  let transactionRefreshCreate: TestTransaction['refreshSession']['create'];
  let transactionRunner: jest.MockedFunction<
    (
      work: (transaction: TestTransaction) => Promise<unknown>,
    ) => Promise<unknown>
  >;
  let roleFindByName: jest.MockedFunction<
    (name: RoleName) => Promise<{ id: string; name: RoleName } | null>
  >;

  beforeEach(async () => {
    userFindUnique = jest.fn();
    refreshSessionFindUnique = jest.fn();
    refreshSessionUpdateMany = jest.fn();
    refreshSessionCreate = jest.fn();
    transactionUserCreate = jest.fn();
    transactionRefreshFindUnique = jest.fn();
    transactionRefreshUpdateMany = jest.fn();
    transactionRefreshCreate = jest.fn();
    roleFindByName = jest.fn().mockResolvedValue({
      id: 'client-role',
      name: RoleName.CLIENT,
    });

    const transaction: TestTransaction = {
      user: { create: transactionUserCreate },
      refreshSession: {
        findUnique: transactionRefreshFindUnique,
        updateMany: transactionRefreshUpdateMany,
        create: transactionRefreshCreate,
      },
    };
    transactionRunner = jest.fn(
      async (
        work: (transaction: TestTransaction) => Promise<unknown>,
      ): Promise<unknown> => work(transaction),
    );
    jwtService = new JwtService();

    const configValues: Readonly<Record<string, string>> = {
      JWT_ACCESS_SECRET: ACCESS_SECRET,
      JWT_REFRESH_SECRET: REFRESH_SECRET,
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      NODE_ENV: 'test',
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: { findUnique: userFindUnique },
            refreshSession: {
              findUnique: refreshSessionFindUnique,
              updateMany: refreshSessionUpdateMany,
              create: refreshSessionCreate,
            },
            $transaction: transactionRunner,
          },
        },
        {
          provide: RolesService,
          useValue: { findByName: roleFindByName },
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string): string => {
              const value = configValues[key];

              if (!value) {
                throw new Error(`Missing test configuration: ${key}`);
              }

              return value;
            },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('normalizes registration, hashes with Argon2id, and assigns CLIENT once', async () => {
    userFindUnique.mockResolvedValue(null);
    let persistedHash = '';
    let persistedCreateArgs: Prisma.UserCreateArgs | undefined;
    transactionUserCreate.mockImplementation(
      (args: Prisma.UserCreateArgs): Promise<unknown> => {
        persistedCreateArgs = args;
        const passwordHash: unknown = args.data.passwordHash;

        if (typeof passwordHash !== 'string') {
          throw new Error('Expected a string password hash');
        }

        persistedHash = passwordHash;
        return Promise.resolve(safeUser);
      },
    );

    const result = await service.register({
      name: '  Test Person  ',
      email: '  Person@Example.COM ',
      password: TEST_PASSWORD,
    });

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { email: 'person@example.com' },
      select: { id: true },
    });
    expect(persistedCreateArgs?.data).toMatchObject({
      name: 'Test Person',
      email: 'person@example.com',
      roles: {
        create: {
          role: { connect: { id: 'client-role' } },
          systemReason: 'PUBLIC_REGISTRATION',
        },
      },
    });
    expect(persistedHash.startsWith('$argon2id$')).toBe(true);
    await expect(verifyPassword(persistedHash, TEST_PASSWORD)).resolves.toBe(
      true,
    );
    expect(result.roles).toEqual([RoleName.CLIENT]);
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('returns conflict for a duplicate registration', async () => {
    userFindUnique.mockResolvedValue({ id: safeUser.id });

    await expect(
      service.register({
        name: safeUser.name,
        email: safeUser.email,
        password: TEST_PASSWORD,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(transactionRunner).not.toHaveBeenCalled();
  });

  it('logs in with valid credentials and stores only a SHA-256 refresh hash', async () => {
    const passwordHash = await hashPassword(TEST_PASSWORD, { type: argon2id });
    userFindUnique.mockResolvedValue({ ...safeUser, passwordHash });
    let storedSession: StoredSession | undefined;
    refreshSessionCreate.mockImplementation(
      (args: Prisma.RefreshSessionCreateArgs): Promise<unknown> => {
        storedSession = readStoredSession(args);
        return Promise.resolve(storedSession);
      },
    );

    const result = await service.login(
      { email: ' Person@Example.COM ', password: TEST_PASSWORD },
      { userAgent: 'unit-test', ipAddress: '127.0.0.1' },
    );
    const accessPayload = await jwtService.verifyAsync<Record<string, unknown>>(
      result.accessToken,
      { secret: ACCESS_SECRET },
    );
    const refreshPayload = await jwtService.verifyAsync<
      Record<string, unknown>
    >(result.refreshToken, { secret: REFRESH_SECRET });

    expect(accessPayload).toMatchObject({ sub: safeUser.id, type: 'access' });
    expect(accessPayload).not.toHaveProperty('roles');
    expect(refreshPayload).toMatchObject({
      sub: safeUser.id,
      sid: storedSession?.id,
      type: 'refresh',
    });
    expect(storedSession?.tokenHash).toHaveLength(64);
    expect(storedSession?.tokenHash).not.toBe(result.refreshToken);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('uses the same generic 401 for unknown email and wrong password', async () => {
    userFindUnique.mockResolvedValueOnce(null);
    const unknownLogin = service.login(
      { email: 'unknown@example.com', password: TEST_PASSWORD },
      {},
    );

    await expect(unknownLogin).rejects.toMatchObject({
      message: INVALID_CREDENTIALS_MESSAGE,
      status: 401,
    });

    const passwordHash = await hashPassword(TEST_PASSWORD, { type: argon2id });
    userFindUnique.mockResolvedValueOnce({ ...safeUser, passwordHash });
    const wrongPasswordLogin = service.login(
      { email: safeUser.email, password: 'WrongPassword123!' },
      {},
    );

    await expect(wrongPasswordLogin).rejects.toMatchObject({
      message: INVALID_CREDENTIALS_MESSAGE,
      status: 401,
    });
  });

  it('rejects inactive users', async () => {
    userFindUnique.mockResolvedValue({
      ...safeUser,
      status: UserStatus.SUSPENDED,
      passwordHash: 'not-read-for-inactive-users',
    });

    await expect(
      service.login({ email: safeUser.email, password: TEST_PASSWORD }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects soft-deleted users even if their status is inconsistent', async () => {
    userFindUnique.mockResolvedValue({
      ...safeUser,
      status: UserStatus.ACTIVE,
      deletedAt: new Date(),
      passwordHash: 'not-read-for-deleted-users',
    });

    await expect(
      service.login({ email: safeUser.email, password: TEST_PASSWORD }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshSessionCreate).not.toHaveBeenCalled();
  });

  it('rejects an access token at the refresh boundary', async () => {
    const accessToken = await jwtService.signAsync(
      { sub: safeUser.id, type: 'access' },
      { secret: ACCESS_SECRET, expiresIn: 900 },
    );

    await expect(service.refresh(accessToken, {})).rejects.toMatchObject({
      message: INVALID_REFRESH_MESSAGE,
      status: 401,
    });
    expect(transactionRunner).not.toHaveBeenCalled();
  });

  it('rotates a refresh session and revokes the previous session atomically', async () => {
    const sessionId = 'session-1';
    const familyId = 'family-1';
    const refreshToken = await jwtService.signAsync(
      { sub: safeUser.id, sid: sessionId, type: 'refresh' },
      { secret: REFRESH_SECRET, expiresIn: 604_800 },
    );
    const tokenHash = createHash('sha256')
      .update(refreshToken, 'utf8')
      .digest('hex');
    transactionRefreshFindUnique.mockResolvedValue({
      id: sessionId,
      userId: safeUser.id,
      tokenHash,
      familyId,
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      user: safeUser,
    });
    transactionRefreshUpdateMany.mockResolvedValue({ count: 1 });
    let replacementSession: StoredSession | undefined;
    transactionRefreshCreate.mockImplementation(
      (args: Prisma.RefreshSessionCreateArgs): Promise<unknown> => {
        replacementSession = readStoredSession(args);
        return Promise.resolve(replacementSession);
      },
    );

    const result = await service.refresh(refreshToken, {
      userAgent: 'rotation-test',
    });

    const revokeArgs = transactionRefreshUpdateMany.mock.calls[0]?.[0];

    expect(revokeArgs?.where).toMatchObject({
      id: sessionId,
      tokenHash,
      revokedAt: null,
    });
    expect(revokeArgs?.data.revokedAt).toBeInstanceOf(Date);
    expect(replacementSession?.id).not.toBe(sessionId);
    expect(replacementSession?.familyId).toBe(familyId);
    expect(result.refreshToken).not.toBe(refreshToken);
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  it('revokes an active family and rejects reuse of a revoked refresh token', async () => {
    const refreshToken = await jwtService.signAsync(
      { sub: safeUser.id, sid: 'revoked-session', type: 'refresh' },
      { secret: REFRESH_SECRET, expiresIn: 604_800 },
    );
    const tokenHash = createHash('sha256')
      .update(refreshToken, 'utf8')
      .digest('hex');
    transactionRefreshFindUnique.mockResolvedValue({
      id: 'revoked-session',
      userId: safeUser.id,
      tokenHash,
      familyId: 'family-reuse',
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: new Date(),
      user: safeUser,
    });
    transactionRefreshUpdateMany.mockResolvedValue({ count: 2 });

    await expect(service.refresh(refreshToken, {})).rejects.toMatchObject({
      message: INVALID_REFRESH_MESSAGE,
      status: 401,
    });
    const revokeFamilyArgs = transactionRefreshUpdateMany.mock.calls[0]?.[0];

    expect(revokeFamilyArgs?.where).toEqual({
      userId: safeUser.id,
      familyId: 'family-reuse',
      revokedAt: null,
    });
    expect(revokeFamilyArgs?.data.revokedAt).toBeInstanceOf(Date);
    expect(transactionRefreshCreate).not.toHaveBeenCalled();
  });

  it('logs out idempotently and revokes only a matching active session', async () => {
    refreshSessionFindUnique.mockResolvedValue({ id: 'session-to-revoke' });
    refreshSessionUpdateMany.mockResolvedValue({ count: 1 });

    await service.logout('opaque-refresh-token');
    await service.logout(undefined);

    expect(refreshSessionUpdateMany).toHaveBeenCalledTimes(1);
    const logoutArgs = refreshSessionUpdateMany.mock.calls[0]?.[0];

    expect(logoutArgs?.where).toEqual({
      id: 'session-to-revoke',
      revokedAt: null,
    });
    expect(logoutArgs?.data.revokedAt).toBeInstanceOf(Date);
  });
});
