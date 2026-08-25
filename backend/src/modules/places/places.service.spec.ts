import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, PropertyType } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { PlacesService } from './places.service';

const PROPERTY_ID = '11111111-1111-4111-8111-111111111111';
const VERSION_ID = '22222222-2222-4222-8222-222222222222';

function sqlText(value: Prisma.Sql): string {
  return value.strings.join('?');
}

function getSqlCall(mock: jest.Mock, index: number): Prisma.Sql {
  const calls: unknown = mock.mock.calls;

  if (!Array.isArray(calls)) {
    throw new Error('Expected Prisma query calls');
  }
  const call: unknown = calls[index];
  if (!Array.isArray(call) || call.length === 0) {
    throw new Error('Expected Prisma query call');
  }

  return call[0] as Prisma.Sql;
}

function makeRow() {
  return {
    propertyId: PROPERTY_ID,
    propertyVersionId: VERSION_ID,
    name: 'Accessible Stop',
    propertyType: PropertyType.PUBLIC_FACILITY,
    description: 'A verified public facility.',
    district: 'Colombo',
    city: 'Colombo',
    isFree: true,
    feeLkr: null,
    latitude: new Prisma.Decimal('6.927079'),
    longitude: new Prisma.Decimal('79.861244'),
    submittedAt: new Date('2026-08-25T00:00:00.000Z'),
    distanceKm: new Prisma.Decimal('1.236'),
  };
}

function makeRelations() {
  return {
    id: VERSION_ID,
    amenities: [
      {
        amenity: {
          code: 'WHEELCHAIR_ACCESS',
          name: 'Wheelchair access',
        },
      },
    ],
    openingHours: [
      {
        weekday: 1,
        openTime: '08:00',
        closeTime: '18:00',
        isClosed: false,
        is24Hours: false,
      },
    ],
    photos: [
      {
        url: 'https://images.example.test/place.jpg',
        altText: 'Entrance',
        isCover: true,
        sortOrder: 0,
      },
      {
        url: 'javascript:alert(1)',
        altText: null,
        isCover: false,
        sortOrder: 1,
      },
    ],
  };
}

describe('PlacesService', () => {
  let queryRaw: jest.Mock;
  let amenityFindMany: jest.Mock;
  let versionFindMany: jest.Mock;
  let service: PlacesService;

  beforeEach(() => {
    queryRaw = jest.fn();
    amenityFindMany = jest.fn().mockResolvedValue([
      { code: 'HANDWASHING', name: 'Handwashing facilities' },
      { code: 'WHEELCHAIR_ACCESS', name: 'Wheelchair access' },
    ]);
    versionFindMany = jest.fn().mockResolvedValue([makeRelations()]);
    const prisma = {
      $queryRaw: queryRaw,
      amenity: { findMany: amenityFindMany },
      propertyVersion: { findMany: versionFindMany },
    } as unknown as PrismaService;

    service = new PlacesService(prisma);
  });

  it('binds user input and enforces the approved active-version invariant', async () => {
    const hostileSearch = "stop%' OR 1=1 --";
    queryRaw
      .mockResolvedValueOnce([makeRow()])
      .mockResolvedValueOnce([{ count: 1n }]);

    const result = await service.listPlaces({
      page: 1,
      pageSize: 20,
      sort: 'newest',
      search: hostileSearch,
      amenities: ['HANDWASHING', 'WHEELCHAIR_ACCESS'],
    });

    const listQuery = getSqlCall(queryRaw, 0);
    const text = sqlText(listQuery);
    expect(text).toContain('p."lifecycleStatus" = ?::"PropertyStatus"');
    expect(text).toContain('pv.id = p."activeVersionId"');
    expect(text).toContain('pv."propertyId" = p.id');
    expect(text).toContain('pv."submittedAt" IS NOT NULL');
    expect(text).not.toContain(hostileSearch);
    expect(listQuery.values).toContain(`%${hostileSearch}%`);
    expect((text.match(/EXISTS \(/g) ?? []).length).toBe(2);
    expect(result.items[0]).toMatchObject({
      propertyId: PROPERTY_ID,
      verified: true,
      wheelchairAccessible: true,
      distanceKm: 1.24,
    });
    expect(result.pagination).toEqual({
      page: 1,
      pageSize: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('uses bound coordinates for radius filtering and distance sorting', async () => {
    queryRaw
      .mockResolvedValueOnce([makeRow()])
      .mockResolvedValueOnce([{ count: 1n }]);

    await service.listPlaces({
      page: 1,
      pageSize: 10,
      sort: 'distance',
      latitude: 6.9271,
      longitude: 79.8612,
      radiusKm: 10,
    });

    const listQuery = getSqlCall(queryRaw, 0);
    const text = sqlText(listQuery);
    expect(text).toContain('6371.0 * 2 * ASIN');
    expect(text).toContain('ORDER BY');
    expect(text).toContain('ASC, p.id ASC');
    expect(listQuery.values).toContain(6.9271);
    expect(listQuery.values).toContain(79.8612);
    expect(listQuery.values).toContain(10);
  });

  it('rejects incomplete coordinates and inactive amenity codes', async () => {
    await expect(
      service.listPlaces({
        page: 1,
        pageSize: 20,
        sort: 'newest',
        latitude: 6.9,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.listPlaces({
        page: 1,
        pageSize: 20,
        sort: 'newest',
        amenities: ['UNKNOWN_AMENITY'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(queryRaw).not.toHaveBeenCalled();
  });

  it('maps public details only and builds directions from stored coordinates', async () => {
    queryRaw.mockResolvedValueOnce([
      {
        ...makeRow(),
        address: '1 Public Road',
        accessNotes: 'Ramp beside the main entrance.',
        phone: '+94110000000',
        email: 'public@example.test',
        website: 'https://place.example.test',
      },
    ]);

    const result = await service.getPlace(PROPERTY_ID);
    const directions = new URL(result.directionsUrl);

    expect(directions.origin).toBe('https://www.google.com');
    expect(directions.pathname).toBe('/maps/dir/');
    expect(directions.searchParams.get('api')).toBe('1');
    expect(directions.searchParams.get('destination')).toBe(
      '6.927079,79.861244',
    );
    expect(result.photos).toHaveLength(1);
    expect(result).not.toHaveProperty('ownerUserId');
    expect(result).not.toHaveProperty('versions');
    expect(result).not.toHaveProperty('storageKey');
  });

  it('returns the same non-disclosing 404 for an ineligible or unknown property', async () => {
    queryRaw.mockResolvedValueOnce([]);

    await expect(service.getPlace(PROPERTY_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
