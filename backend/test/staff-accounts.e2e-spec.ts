import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RoleName, UserStatus } from '../src/generated/prisma/client.js';
import { StaffAccountsService } from '../src/modules/staff-accounts/staff-accounts.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ACCESS_SECRET =
  'e2e-access-secret-that-is-longer-than-thirty-two-characters';
const ACTOR_ID = 'staff-account-e2e-actor';
const createdAt = new Date('2026-08-25T00:00:00.000Z');
const input = {
  name: 'New Staff Member',
  email: 'new-staff@example.test',
  temporaryPassword: 'Temporary-Staff-Password-123!',
};

describe('Privileged staff account creation (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let currentRoles: RoleName[];
  let createReviewer: jest.Mock;
  let createAdmin: jest.Mock;

  beforeEach(async () => {
    currentRoles = [RoleName.CLIENT];
    createReviewer = jest.fn().mockResolvedValue({
      id: 'created-reviewer',
      email: input.email,
      name: input.name,
      phone: null,
      language: 'en',
      status: UserStatus.ACTIVE,
      roles: [RoleName.REVIEWER],
      createdAt,
    });
    createAdmin = jest.fn().mockResolvedValue({
      id: 'created-admin',
      email: input.email,
      name: input.name,
      phone: null,
      language: 'en',
      status: UserStatus.ACTIVE,
      roles: [RoleName.ADMIN],
      createdAt,
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({
        role: { count: jest.fn().mockResolvedValue(5) },
        user: {
          findUnique: jest.fn().mockImplementation(() =>
            Promise.resolve({
              id: ACTOR_ID,
              email: 'actor@example.test',
              name: 'Actor',
              phone: null,
              language: 'en',
              status: UserStatus.ACTIVE,
              createdAt,
              roles: currentRoles.map((name) => ({ role: { name } })),
            }),
          ),
        },
      })
      .overrideProvider(StaffAccountsService)
      .useValue({ createReviewer, createAdmin })
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

  it('requires ADMIN and creates a REVIEWER-only response', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/reviewers')
      .send(input)
      .expect(401);

    currentRoles = [RoleName.REVIEWER];
    await request(app.getHttpServer())
      .post('/api/v1/admin/reviewers')
      .set('Authorization', `Bearer ${await token()}`)
      .send(input)
      .expect(403);

    currentRoles = [RoleName.ADMIN];
    const response = await request(app.getHttpServer())
      .post('/api/v1/admin/reviewers')
      .set('Authorization', `Bearer ${await token()}`)
      .send(input)
      .expect(201);

    expect(response.body).toHaveProperty('roles', [RoleName.REVIEWER]);
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(createReviewer).toHaveBeenCalledWith(ACTOR_ID, input);
  });

  it('requires DEVELOPER and creates an ADMIN-only response', async () => {
    for (const role of [RoleName.REVIEWER, RoleName.ADMIN]) {
      currentRoles = [role];
      await request(app.getHttpServer())
        .post('/api/v1/developer/admins')
        .set('Authorization', `Bearer ${await token()}`)
        .send(input)
        .expect(403);
    }

    currentRoles = [RoleName.DEVELOPER];
    const response = await request(app.getHttpServer())
      .post('/api/v1/developer/admins')
      .set('Authorization', `Bearer ${await token()}`)
      .send(input)
      .expect(201);

    expect(response.body).toHaveProperty('roles', [RoleName.ADMIN]);
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(createAdmin).toHaveBeenCalledWith(ACTOR_ID, input);
  });

  it.each(['role', 'roles', 'status', 'passwordHash'])(
    'rejects protected staff field %s',
    async (field) => {
      currentRoles = [RoleName.ADMIN];
      await request(app.getHttpServer())
        .post('/api/v1/admin/reviewers')
        .set('Authorization', `Bearer ${await token()}`)
        .send({
          ...input,
          [field]:
            field === 'roles' ? [RoleName.DEVELOPER] : RoleName.DEVELOPER,
        })
        .expect(400);

      expect(createReviewer).not.toHaveBeenCalled();
    },
  );

  it('does not expose an API that creates DEVELOPER accounts', async () => {
    currentRoles = [RoleName.DEVELOPER];
    const authorization = `Bearer ${await token()}`;

    await request(app.getHttpServer())
      .post('/api/v1/developer/developers')
      .set('Authorization', authorization)
      .send(input)
      .expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/admin/developers')
      .set('Authorization', authorization)
      .send(input)
      .expect(404);
  });
});
