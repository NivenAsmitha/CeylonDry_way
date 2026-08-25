import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { RoleName, UserStatus } from '../src/generated/prisma/client.js';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ACCESS_SECRET =
  'e2e-access-secret-that-is-longer-than-thirty-two-characters';
const REFRESH_SECRET =
  'e2e-refresh-secret-that-is-different-and-longer-than-thirty-two';
const createdAt = new Date('2026-01-01T00:00:00.000Z');
const safeUserRecord = {
  id: 'e2e-user-1',
  email: 'person@example.com',
  name: 'Test Person',
  phone: null,
  language: 'en',
  status: UserStatus.ACTIVE,
  createdAt,
  roles: [{ role: { name: RoleName.CLIENT } }],
};
const safeUserResponse = {
  id: safeUserRecord.id,
  email: safeUserRecord.email,
  name: safeUserRecord.name,
  phone: safeUserRecord.phone,
  language: safeUserRecord.language,
  status: safeUserRecord.status,
  roles: [RoleName.CLIENT],
  createdAt,
};

describe('Authentication and current user (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let register: jest.MockedFunction<() => Promise<typeof safeUserResponse>>;
  let login: jest.MockedFunction<
    () => Promise<{
      accessToken: string;
      refreshToken: string;
      user: typeof safeUserResponse;
    }>
  >;
  let refresh: jest.MockedFunction<
    (
      refreshToken: string,
      metadata: { userAgent?: string; ipAddress?: string },
    ) => Promise<{
      accessToken: string;
      refreshToken: string;
      user: typeof safeUserResponse;
    }>
  >;
  let logout: jest.MockedFunction<() => Promise<void>>;
  let userUpdateMany: jest.MockedFunction<() => Promise<{ count: number }>>;

  beforeEach(async () => {
    jwtService = new JwtService();
    const accessToken = await jwtService.signAsync(
      { sub: safeUserRecord.id, type: 'access' },
      { secret: ACCESS_SECRET, expiresIn: 900 },
    );
    register = jest.fn().mockResolvedValue(safeUserResponse);
    login = jest.fn().mockResolvedValue({
      accessToken,
      refreshToken: 'opaque-refresh-cookie-for-controller-test',
      user: safeUserResponse,
    });
    refresh = jest.fn().mockResolvedValue({
      accessToken,
      refreshToken: 'rotated-opaque-refresh-cookie-for-controller-test',
      user: safeUserResponse,
    });
    logout = jest.fn().mockResolvedValue(undefined);
    userUpdateMany = jest.fn().mockResolvedValue({ count: 1 });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        role: { count: jest.fn().mockResolvedValue(5) },
        user: {
          findUnique: jest.fn().mockResolvedValue(safeUserRecord),
          updateMany: userUpdateMany,
        },
        $transaction: jest.fn(),
      })
      .overrideProvider(AuthService)
      .useValue({
        register,
        login,
        refresh,
        logout,
        getRefreshCookieOptions: () => ({
          httpOnly: true,
          secure: false,
          sameSite: 'lax' as const,
          path: '/api/v1/auth',
          maxAge: 604_800_000,
        }),
        getRefreshCookieClearOptions: () => ({
          httpOnly: true,
          secure: false,
          sameSite: 'lax' as const,
          path: '/api/v1/auth',
        }),
      })
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
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns safe CLIENT registration, rejects duplicate email and submitted roles', async () => {
    const registration = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Person',
        email: 'person@example.com',
        password: 'VeryStrongPass123!',
      })
      .expect(201);

    expect(registration.body).toMatchObject({
      email: safeUserResponse.email,
      roles: [RoleName.CLIENT],
    });
    expect(registration.body).not.toHaveProperty('passwordHash');

    register.mockRejectedValueOnce(
      new ConflictException('An account with this email already exists'),
    );
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Person',
        email: 'person@example.com',
        password: 'VeryStrongPass123!',
      })
      .expect(409);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Person',
        email: 'other@example.com',
        password: 'VeryStrongPass123!',
        role: RoleName.ADMIN,
      })
      .expect(400);
  });

  it.each([
    ['roles', [RoleName.REVIEWER]],
    ['status', UserStatus.ACTIVE],
    ['passwordHash', 'forbidden'],
  ])('rejects protected public registration field %s', async (field, value) => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        name: 'Test Person',
        email: 'other@example.com',
        password: 'VeryStrongPass123!',
        [field]: value,
      })
      .expect(400);

    expect(register).not.toHaveBeenCalled();
  });

  it('returns an access token, sets an HttpOnly refresh cookie, and never serializes it', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: safeUserRecord.email, password: 'VeryStrongPass123!' })
      .expect(200);
    const setCookies = response.headers['set-cookie'];

    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).toHaveProperty('user.roles', [RoleName.CLIENT]);
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(response.body).not.toHaveProperty('user.passwordHash');
    expect(setCookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^ceylon_dryway_refresh=.*HttpOnly.*SameSite=Lax$/,
        ),
      ]),
    );
  });

  it('protects /me and loads the safe current user and current roles', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').expect(401);

    const accessToken = await jwtService.signAsync(
      { sub: safeUserRecord.id, type: 'access' },
      { secret: ACCESS_SECRET, expiresIn: 900 },
    );
    const response = await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: safeUserRecord.id,
      roles: [RoleName.CLIENT],
      status: UserStatus.ACTIVE,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('does not accept a refresh JWT as a bearer access token', async () => {
    const refreshToken = await jwtService.signAsync(
      { sub: safeUserRecord.id, sid: 'session-1', type: 'refresh' },
      { secret: REFRESH_SECRET, expiresIn: 604_800 },
    );

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);
  });

  it('rotates only from the refresh cookie and does not serialize it', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', 'ceylon_dryway_refresh=controller-refresh-token')
      .expect(200);
    const setCookies = response.headers['set-cookie'];

    const refreshCall = refresh.mock.calls[0];

    expect(refreshCall?.[0]).toBe('controller-refresh-token');
    expect(refreshCall?.[1]).toBeDefined();
    expect(response.body).toHaveProperty('accessToken');
    expect(response.body).not.toHaveProperty('refreshToken');
    expect(setCookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^ceylon_dryway_refresh=.*HttpOnly/),
      ]),
    );
  });

  it('rejects protected profile fields before persistence', async () => {
    const accessToken = await jwtService.signAsync(
      { sub: safeUserRecord.id, type: 'access' },
      { secret: ACCESS_SECRET, expiresIn: 900 },
    );

    await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        email: 'changed@example.com',
        roles: [RoleName.ADMIN],
        status: UserStatus.DISABLED,
        passwordHash: 'forbidden',
      })
      .expect(400);
    expect(userUpdateMany).not.toHaveBeenCalled();
  });

  it('clears the matching cookie and keeps logout idempotent', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', 'ceylon_dryway_refresh=logout-refresh-token')
      .expect(204);
    const setCookies = response.headers['set-cookie'];

    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(204);

    expect(logout).toHaveBeenNthCalledWith(1, 'logout-refresh-token');
    expect(logout).toHaveBeenNthCalledWith(2, undefined);
    expect(setCookies).toEqual(
      expect.arrayContaining([
        expect.stringMatching(
          /^ceylon_dryway_refresh=; Path=\/api\/v1\/auth; Expires=.*HttpOnly; SameSite=Lax$/,
        ),
      ]),
    );
  });
});
