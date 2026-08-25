import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PropertyType } from '../src/generated/prisma/client.js';
import { PlacesService } from '../src/modules/places/places.service';
import { PrismaService } from '../src/prisma/prisma.service';

const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';

const publicItem = {
  propertyId: PROPERTY_ID,
  name: 'Accessible Stop',
  propertyType: PropertyType.PUBLIC_FACILITY,
  shortDescription: 'A verified public facility.',
  district: 'Colombo',
  city: 'Colombo',
  isFree: true,
  feeLkr: null,
  wheelchairAccessible: true,
  amenities: [{ code: 'WHEELCHAIR_ACCESS', name: 'Wheelchair access' }],
  coverImage: null,
  latitude: 6.927079,
  longitude: 79.861244,
  distanceKm: null,
  verified: true as const,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

describe('Public places (e2e)', () => {
  let app: INestApplication<App>;
  let listPlaces: jest.Mock;
  let getPlace: jest.Mock;

  beforeEach(async () => {
    listPlaces = jest.fn().mockResolvedValue({
      items: [publicItem],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      availableAmenities: [
        { code: 'WHEELCHAIR_ACCESS', name: 'Wheelchair access' },
      ],
    });
    getPlace = jest.fn().mockResolvedValue({
      ...publicItem,
      description: 'A verified public facility.',
      address: '1 Public Road',
      accessNotes: null,
      phone: null,
      email: null,
      website: null,
      openingHours: [],
      photos: [],
      directionsUrl:
        'https://www.google.com/maps/dir/?api=1&destination=6.927079%2C79.861244',
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({ role: { count: jest.fn().mockResolvedValue(5) } })
      .overrideProvider(PlacesService)
      .useValue({ listPlaces, getPlace })
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

  it('lists and retrieves a place without authentication', async () => {
    const listResponse = await request(app.getHttpServer())
      .get('/api/v1/places')
      .expect(200);
    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/places/${PROPERTY_ID}`)
      .expect(200);

    const listBody: unknown = listResponse.body;
    const detailBody: unknown = detailResponse.body;
    const items = isRecord(listBody) ? listBody.items : undefined;
    const firstItem = Array.isArray(items) ? (items[0] as unknown) : undefined;
    expect(firstItem).not.toHaveProperty('ownerUserId');
    expect(detailBody).not.toHaveProperty('versions');
    expect(listPlaces).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 20, sort: 'newest' }),
    );
    expect(getPlace).toHaveBeenCalledWith(PROPERTY_ID);
  });

  it('parses false explicitly and transforms bounded paging and coordinates', async () => {
    await request(app.getHttpServer())
      .get(
        '/api/v1/places?isFree=false&page=2&pageSize=10&sort=distance&latitude=6.9&longitude=79.8&radiusKm=5',
      )
      .expect(200);

    expect(listPlaces).toHaveBeenCalledWith(
      expect.objectContaining({
        isFree: false,
        page: 2,
        pageSize: 10,
        sort: 'distance',
        latitude: 6.9,
        longitude: 79.8,
        radiusKm: 5,
      }),
    );
  });

  it.each([
    'page=0',
    'pageSize=51',
    'sort=unsafe',
    'propertyType=UNLISTED',
    'isFree=1',
    'latitude=91&longitude=79.8',
    'radiusKm=201&latitude=6.9&longitude=79.8',
    'unexpected=private',
  ])('rejects invalid query input: %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/api/v1/places?${query}`)
      .expect(400);
    expect(listPlaces).not.toHaveBeenCalled();
  });

  it('rejects malformed identifiers before the service and preserves 404 behavior', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/places/not-a-uuid')
      .expect(400);
    expect(getPlace).not.toHaveBeenCalled();

    getPlace.mockRejectedValueOnce(new NotFoundException('Place not found'));
    await request(app.getHttpServer())
      .get(`/api/v1/places/${PROPERTY_ID}`)
      .expect(404)
      .expect(({ body }) => {
        const responseBody: unknown = body;
        expect(isRecord(responseBody) ? responseBody.message : undefined).toBe(
          'Place not found',
        );
        expect(responseBody).not.toHaveProperty('lifecycleStatus');
      });
  });
});
