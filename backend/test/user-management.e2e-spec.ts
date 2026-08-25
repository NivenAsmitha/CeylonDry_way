import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RoleName, UserStatus } from '../src/generated/prisma/client.js';
import { PasswordResetService } from '../src/modules/password-reset/password-reset.service';
import { UserManagementService } from '../src/modules/user-management/user-management.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ACCESS_SECRET =
  'e2e-access-secret-that-is-longer-than-thirty-two-characters';
const ACTOR_ID = '00000000-0000-4000-8000-000000000001';
const TARGET_ID = '00000000-0000-4000-8000-000000000002';
const createdAt = new Date('2026-08-25T00:00:00.000Z');

describe('User management API authorization and contracts (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let currentRoles: RoleName[];
  let management: {
    listUsers: jest.Mock;
    getUser: jest.Mock;
    updateUser: jest.Mock;
    changeStatus: jest.Mock;
    initiatePasswordReset: jest.Mock;
    revokeSessions: jest.Mock;
    softDelete: jest.Mock;
    restore: jest.Mock;
  };
  let completeReset: jest.Mock;

  beforeEach(async () => {
    currentRoles = [RoleName.CLIENT];
    const safeUser = {
      id: TARGET_ID,
      email: 'target@example.test',
      name: 'Target User',
      phone: null,
      language: 'en',
      status: UserStatus.ACTIVE,
      statusChangedAt: createdAt,
      roles: [RoleName.CLIENT],
      createdAt,
      updatedAt: createdAt,
      deletedAt: null,
      isDeleted: false,
      allowedActions: ['VIEW'],
    };
    management = {
      listUsers: jest.fn().mockResolvedValue({
        items: [safeUser],
        pagination: {
          page: 1,
          pageSize: 20,
          totalItems: 1,
          totalPages: 1,
        },
      }),
      getUser: jest.fn().mockResolvedValue(safeUser),
      updateUser: jest.fn().mockResolvedValue(safeUser),
      changeStatus: jest.fn().mockResolvedValue(safeUser),
      initiatePasswordReset: jest.fn().mockResolvedValue({
        accepted: true,
        message: 'Password reset instructions were sent',
      }),
      revokeSessions: jest.fn().mockResolvedValue({ revokedSessionCount: 1 }),
      softDelete: jest.fn().mockResolvedValue(safeUser),
      restore: jest.fn().mockResolvedValue(safeUser),
    };
    completeReset = jest
      .fn()
      .mockResolvedValue({ message: 'Password reset completed' });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        user: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: ACTOR_ID,
              email: 'actor@example.test',
              name: 'Actor',
              phone: null,
              language: 'en',
              status: UserStatus.ACTIVE,
              deletedAt: null,
              createdAt,
              roles: currentRoles.map((name) => ({ role: { name } })),
            }),
          ),
        },
      })
      .overrideProvider(UserManagementService)
      .useValue(management)
      .overrideProvider(PasswordResetService)
      .useValue({ complete: completeReset })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    jwtService = new JwtService();
  });

  afterEach(async () => {
    await app.close();
  });

  function token(): Promise<string> {
    return jwtService.signAsync(
      { sub: ACTOR_ID, type: 'access' },
      { secret: ACCESS_SECRET, expiresIn: 900 },
    );
  }

  it('returns 401 anonymously and 403 for client, owner, and reviewer accounts', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/management/users')
      .expect(401);

    for (const roles of [
      [RoleName.CLIENT],
      [RoleName.CLIENT, RoleName.OWNER],
      [RoleName.REVIEWER],
    ]) {
      currentRoles = roles;
      await request(app.getHttpServer())
        .get('/api/v1/management/users')
        .set('Authorization', `Bearer ${await token()}`)
        .expect(403);
    }
  });

  it.each([RoleName.ADMIN, RoleName.DEVELOPER])(
    'allows %s to list safe users',
    async (role) => {
      currentRoles = [role];
      const response = await request(app.getHttpServer())
        .get('/api/v1/management/users?page=1&pageSize=20&includeDeleted=false')
        .set('Authorization', `Bearer ${await token()}`)
        .expect(200);

      expect(response.body).not.toHaveProperty('items.0.passwordHash');
      expect(response.body).not.toHaveProperty('items.0.tokenHash');
      expect(response.body).not.toHaveProperty('items.0.refreshSessions');
      expect(management.listUsers).toHaveBeenCalledWith(
        ACTOR_ID,
        expect.objectContaining({ page: 1, pageSize: 20 }),
      );
    },
  );

  it('bounds pagination and search before the service is called', async () => {
    currentRoles = [RoleName.ADMIN];
    const authorization = `Bearer ${await token()}`;

    await request(app.getHttpServer())
      .get('/api/v1/management/users?pageSize=101')
      .set('Authorization', authorization)
      .expect(400);
    await request(app.getHttpServer())
      .get(`/api/v1/management/users?search=${'x'.repeat(101)}`)
      .set('Authorization', authorization)
      .expect(400);
    expect(management.listUsers).not.toHaveBeenCalled();
  });

  it.each([
    'email',
    'password',
    'passwordHash',
    'roles',
    'status',
    'deletedAt',
  ])('rejects protected profile field %s', async (field) => {
    currentRoles = [RoleName.ADMIN];
    await request(app.getHttpServer())
      .patch(`/api/v1/management/users/${TARGET_ID}`)
      .set('Authorization', `Bearer ${await token()}`)
      .send({ name: 'Safe Name', [field]: 'not-allowed' })
      .expect(400);
    expect(management.updateUser).not.toHaveBeenCalled();
  });

  it('accepts reset initiation without returning a password or token', async () => {
    currentRoles = [RoleName.ADMIN];
    const response = await request(app.getHttpServer())
      .post(`/api/v1/management/users/${TARGET_ID}/password-reset`)
      .set('Authorization', `Bearer ${await token()}`)
      .send({ reason: 'User requested account recovery' })
      .expect(202);

    expect(response.body).toEqual({
      accepted: true,
      message: 'Password reset instructions were sent',
    });
    expect(response.body).not.toHaveProperty('token');
    expect(response.body).not.toHaveProperty('password');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('validates the public reset contract and does not log in the user', async () => {
    const input = {
      token: 'a'.repeat(43),
      newPassword: 'NewStrongPassword123!',
      confirmPassword: 'NewStrongPassword123!',
    };
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send(input)
      .expect(200);

    expect(response.body).toEqual({ message: 'Password reset completed' });
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(completeReset).toHaveBeenCalledWith(input);
  });
});
