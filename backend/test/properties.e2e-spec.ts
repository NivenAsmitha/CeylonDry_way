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
  RoleName,
  UserStatus,
} from '../src/generated/prisma/client.js';
import { PropertiesService } from '../src/modules/properties/properties.service';
import { PropertyPhotosService } from '../src/modules/property-photos/property-photos.service';
import { PrismaService } from '../src/prisma/prisma.service';

const ACCESS_SECRET =
  'e2e-access-secret-that-is-longer-than-thirty-two-characters';
const USER_ID = 'e2e-property-user';
const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';
const createdAt = new Date('2026-08-25T00:00:00.000Z');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const draftResponse = {
  id: PROPERTY_ID,
  lifecycleStatus: PropertyStatus.DRAFT,
  createdAt: createdAt.toISOString(),
  updatedAt: createdAt.toISOString(),
  canEdit: true,
  canSubmit: true,
  activeVersion: {
    id: VERSION_ID,
    version: 1,
    propertyType: null,
    name: null,
    organisation: null,
    description: null,
    accessNotes: null,
    isFree: true,
    feeLkr: null,
    phone: null,
    email: null,
    website: null,
    address: null,
    district: null,
    city: null,
    latitude: null,
    longitude: null,
    submittedAt: null,
    amenities: [],
    openingHours: [],
    photos: [],
  },
};

describe('Owner properties (e2e)', () => {
  let app: INestApplication<App>;
  let jwtService: JwtService;
  let currentRoles: RoleName[];
  let createDraft: jest.Mock;
  let listOwnedProperties: jest.Mock;
  let uploadPhotos: jest.Mock;
  let reorderPhotos: jest.Mock;

  beforeEach(async () => {
    currentRoles = [RoleName.CLIENT];
    createDraft = jest.fn().mockResolvedValue(draftResponse);
    listOwnedProperties = jest.fn().mockResolvedValue({
      items: [draftResponse],
      total: 1,
    });
    uploadPhotos = jest
      .fn()
      .mockImplementation(
        (
          _ownerId: string,
          _propertyId: string,
          files: Express.Multer.File[],
        ) =>
          files.length
            ? Promise.resolve([
                {
                  id: '33333333-3333-4333-8333-333333333333',
                  url: 'http://localhost:3000/api/v1/media/property-photos/test.jpg',
                  sortOrder: 0,
                  isCover: true,
                  altText: null,
                },
              ])
            : Promise.reject(new Error('No files received')),
      );
    reorderPhotos = jest.fn().mockResolvedValue([]);

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
              email: 'property-owner@example.test',
              name: 'Property Owner',
              phone: null,
              language: 'en',
              status: UserStatus.ACTIVE,
              createdAt,
              roles: currentRoles.map((name) => ({ role: { name } })),
            }),
          ),
        },
      })
      .overrideProvider(PropertiesService)
      .useValue({
        createDraft,
        listOwnedProperties,
        listActiveAmenities: jest.fn().mockResolvedValue([
          {
            code: 'HANDWASHING',
            name: 'Handwashing facilities',
            description: null,
          },
        ]),
        getOwnedProperty: jest.fn().mockResolvedValue(draftResponse),
        updateOwnedProperty: jest.fn().mockResolvedValue(draftResponse),
        submitOwnedProperty: jest.fn().mockResolvedValue({
          ...draftResponse,
          lifecycleStatus: PropertyStatus.PENDING,
          canEdit: false,
          canSubmit: false,
        }),
      })
      .overrideProvider(PropertyPhotosService)
      .useValue({
        upload: uploadPhotos,
        reorder: reorderPhotos,
        setCover: jest.fn().mockResolvedValue([]),
        updateAltText: jest.fn().mockResolvedValue([]),
        remove: jest.fn().mockResolvedValue([]),
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
    jwtService = new JwtService();
  });

  afterEach(async () => {
    await app.close();
  });

  async function accessToken(): Promise<string> {
    return jwtService.signAsync(
      { sub: USER_ID, type: 'access' },
      { secret: ACCESS_SECRET, expiresIn: 900 },
    );
  }

  it('allows an authenticated CLIENT to create the first draft', async () => {
    const token = await accessToken();

    const response = await request(app.getHttpServer())
      .post('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(201);

    expect(createDraft).toHaveBeenCalledWith(USER_ID, {});
    const body: unknown = response.body;
    expect(isRecord(body) ? body.lifecycleStatus : undefined).toBe(
      PropertyStatus.DRAFT,
    );
  });

  it.each(['ownerUserId', 'lifecycleStatus'])(
    'rejects protected input field %s',
    async (field) => {
      const token = await accessToken();

      await request(app.getHttpServer())
        .post('/api/v1/owner/properties')
        .set('Authorization', `Bearer ${token}`)
        .send({ [field]: field === 'ownerUserId' ? USER_ID : 'APPROVED' })
        .expect(400);

      expect(createDraft).not.toHaveBeenCalled();
    },
  );

  it('requires OWNER for the dashboard after first-draft creation', async () => {
    const clientToken = await accessToken();

    await request(app.getHttpServer())
      .get('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    currentRoles = [RoleName.CLIENT, RoleName.OWNER];
    const ownerToken = await accessToken();
    const response = await request(app.getHttpServer())
      .get('/api/v1/owner/properties')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    const body: unknown = response.body;
    expect(isRecord(body) ? body.total : undefined).toBe(1);
    expect(listOwnedProperties).toHaveBeenCalledWith(USER_ID);
  });

  it('does not expose an owner listing through a public property route', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/properties/${PROPERTY_ID}`)
      .expect(404);
  });

  it('requires authentication and OWNER before multipart photo upload', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/owner/properties/${PROPERTY_ID}/photos`)
      .attach('photos', Buffer.from('fixture'), {
        filename: 'fixture.jpg',
        contentType: 'image/jpeg',
      })
      .expect(401);

    const clientToken = await accessToken();
    await request(app.getHttpServer())
      .post(`/api/v1/owner/properties/${PROPERTY_ID}/photos`)
      .set('Authorization', `Bearer ${clientToken}`)
      .attach('photos', Buffer.from('fixture'), {
        filename: 'fixture.jpg',
        contentType: 'image/jpeg',
      })
      .expect(403);
    expect(uploadPhotos).not.toHaveBeenCalled();
  });

  it('accepts the documented photos field for an authenticated owner', async () => {
    currentRoles = [RoleName.CLIENT, RoleName.OWNER];
    const response = await request(app.getHttpServer())
      .post(`/api/v1/owner/properties/${PROPERTY_ID}/photos`)
      .set('Authorization', `Bearer ${await accessToken()}`)
      .attach('photos', Buffer.from('fixture'), {
        filename: 'fixture.jpg',
        contentType: 'image/jpeg',
      })
      .expect(201);

    expect(uploadPhotos).toHaveBeenCalledWith(
      USER_ID,
      PROPERTY_ID,
      expect.arrayContaining([
        expect.objectContaining({
          fieldname: 'photos',
          mimetype: 'image/jpeg',
        }),
      ]),
    );
    expect(response.body).not.toHaveProperty('0.storageKey');
  });

  it('rejects an oversized multipart photo before the service', async () => {
    currentRoles = [RoleName.CLIENT, RoleName.OWNER];
    await request(app.getHttpServer())
      .post(`/api/v1/owner/properties/${PROPERTY_ID}/photos`)
      .set('Authorization', `Bearer ${await accessToken()}`)
      .attach('photos', Buffer.alloc(5 * 1024 * 1024 + 1), {
        filename: 'too-large.jpg',
        contentType: 'image/jpeg',
      })
      .expect(413);
    expect(uploadPhotos).not.toHaveBeenCalled();
  });

  it('rejects duplicate photo reorder IDs before the service', async () => {
    currentRoles = [RoleName.CLIENT, RoleName.OWNER];
    const duplicateId = '33333333-3333-4333-8333-333333333333';
    await request(app.getHttpServer())
      .patch(`/api/v1/owner/properties/${PROPERTY_ID}/photos/reorder`)
      .set('Authorization', `Bearer ${await accessToken()}`)
      .send({ photoIds: [duplicateId, duplicateId] })
      .expect(400);
    expect(reorderPhotos).not.toHaveBeenCalled();
  });
});
