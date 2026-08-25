import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  PropertyStatus,
  PropertyType,
  ReviewDecisionType,
  RoleName,
  UserStatus,
} from '../src/generated/prisma/client.js';
import { ReviewerService } from '../src/modules/reviewer/reviewer.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ACCESS_SECRET =
  'e2e-access-secret-that-is-longer-than-thirty-two-characters';
const USER_ID = 'reviewer-e2e-user';
const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const createdAt = new Date('2026-08-25T00:00:00.000Z');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const queueResponse = {
  items: [
    {
      propertyId: PROPERTY_ID,
      propertyVersionId: VERSION_ID,
      version: 1,
      name: 'Review property',
      propertyType: PropertyType.HOTEL,
      district: 'Colombo',
      city: 'Colombo',
      lifecycleStatus: PropertyStatus.PENDING,
      submittedAt: createdAt.toISOString(),
      owner: { name: 'Safe Owner' },
    },
  ],
  pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
};

const detailResponse = {
  propertyId: PROPERTY_ID,
  lifecycleStatus: PropertyStatus.PENDING,
  owner: { name: 'Safe Owner' },
  submittedVersion: {
    id: VERSION_ID,
    version: 1,
    propertyType: PropertyType.HOTEL,
    name: 'Review property',
    organisation: null,
    description: 'Safe description',
    accessNotes: 'Use the entrance',
    isFree: true,
    feeLkr: null,
    phone: null,
    email: null,
    website: null,
    address: '1 Test Road',
    district: 'Colombo',
    city: 'Colombo',
    latitude: 6.9271,
    longitude: 79.8612,
    submittedAt: createdAt.toISOString(),
    amenities: [],
    openingHours: [],
    photos: [],
  },
  allowedDecisions: [
    ReviewDecisionType.APPROVE,
    ReviewDecisionType.REQUEST_CHANGES,
    ReviewDecisionType.REJECT,
  ],
  decisionHistory: [],
};

describe('Reviewer listings (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let currentRoles: RoleName[];
  let listListings: jest.Mock;
  let getListing: jest.Mock;
  let decide: jest.Mock;

  beforeEach(async () => {
    currentRoles = [RoleName.CLIENT];
    listListings = jest.fn().mockResolvedValue(queueResponse);
    getListing = jest.fn().mockResolvedValue(detailResponse);
    decide = jest.fn().mockResolvedValue({
      ...detailResponse,
      lifecycleStatus: PropertyStatus.APPROVED,
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
              id: USER_ID,
              email: 'reviewer@example.test',
              name: 'Reviewer',
              phone: null,
              language: 'en',
              status: UserStatus.ACTIVE,
              createdAt,
              roles: currentRoles.map((name) => ({ role: { name } })),
            }),
          ),
        },
      })
      .overrideProvider(ReviewerService)
      .useValue({ listListings, getListing, decide })
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

  async function token(): Promise<string> {
    return jwtService.signAsync(
      { sub: USER_ID, type: 'access' },
      { secret: ACCESS_SECRET, expiresIn: 900 },
    );
  }

  it('returns 401 anonymously and 403 for client and owner accounts', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/reviewer/listings')
      .expect(401);

    await request(app.getHttpServer())
      .get('/api/v1/reviewer/listings')
      .set('Authorization', `Bearer ${await token()}`)
      .expect(403);

    currentRoles = [RoleName.CLIENT, RoleName.OWNER];
    await request(app.getHttpServer())
      .get('/api/v1/reviewer/listings')
      .set('Authorization', `Bearer ${await token()}`)
      .expect(403);
  });

  it('permits REVIEWER-only to access queue and safe details', async () => {
    currentRoles = [RoleName.REVIEWER];
    const accessToken = await token();
    const queue = await request(app.getHttpServer())
      .get('/api/v1/reviewer/listings')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/reviewer/listings/${PROPERTY_ID}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const queueBody: unknown = queue.body;
    const detailBody: unknown = detail.body;
    const owner = isRecord(detailBody) ? detailBody.owner : null;

    expect(isRecord(queueBody) && Array.isArray(queueBody.items)).toBe(true);
    expect(detailBody).not.toHaveProperty('ownerUserId');
    expect(owner).not.toHaveProperty('email');
    expect(detailBody).not.toHaveProperty('passwordHash');
  });

  it('does not treat ADMIN or DEVELOPER as reviewer-role inheritance', async () => {
    for (const role of [RoleName.ADMIN, RoleName.DEVELOPER]) {
      currentRoles = [role];
      await request(app.getHttpServer())
        .get('/api/v1/reviewer/listings')
        .set('Authorization', `Bearer ${await token()}`)
        .expect(403);
    }
  });

  it('bounds pagination and permits only controlled status filters', async () => {
    currentRoles = [RoleName.REVIEWER];
    const accessToken = await token();

    await request(app.getHttpServer())
      .get('/api/v1/reviewer/listings?page=0')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/reviewer/listings?pageSize=51')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/reviewer/listings?status=DRAFT')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);
  });

  it('rejects decision field spoofing before the service is called', async () => {
    currentRoles = [RoleName.REVIEWER];

    await request(app.getHttpServer())
      .post(`/api/v1/reviewer/listings/${PROPERTY_ID}/decision`)
      .set('Authorization', `Bearer ${await token()}`)
      .send({
        decision: ReviewDecisionType.APPROVE,
        reviewerId: 'spoofed-reviewer',
        lifecycleStatus: PropertyStatus.APPROVED,
      })
      .expect(400);

    expect(decide).not.toHaveBeenCalled();
  });
});
