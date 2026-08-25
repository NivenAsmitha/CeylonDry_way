import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { publicEligibilitySql } from '../properties/public-eligibility';
import type { PlaceListQueryDto } from './dto/place-list-query.dto';
import type {
  PublicAmenityDto,
  PublicPlaceDetailsDto,
  PublicPlaceListResponseDto,
} from './dto/place-response.dto';
import {
  mapPublicPlaceDetails,
  mapPublicPlaceListItem,
  publicVersionRelationsSelect,
  type PublicPlaceDetailsRow,
  type PublicPlaceListRow,
  type PublicVersionRelations,
} from './places.mapper';
import { PrismaService } from '../../prisma/prisma.service';

const WHEELCHAIR_AMENITY_CODE = 'WHEELCHAIR_ACCESS';

interface CountRow {
  count: bigint | number | string;
}

interface QueryIssue {
  field: string;
  message: string;
}

function queryValidationError(
  message: string,
  details: QueryIssue[],
): BadRequestException {
  return new BadRequestException({
    code: 'PLACE_QUERY_INVALID',
    message,
    details,
  });
}

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPlaces(
    query: PlaceListQueryDto,
  ): Promise<PublicPlaceListResponseDto> {
    this.assertCoordinateQuery(query);
    const availableAmenities = await this.listActiveAmenities();
    const amenityCodes = this.getRequiredAmenityCodes(query);
    this.assertActiveAmenityCodes(amenityCodes, availableAmenities);

    const distanceSql = this.getDistanceSql(query);
    const whereSql = this.buildWhereSql(query, amenityCodes, distanceSql);
    const orderSql = this.buildOrderSql(query, distanceSql);
    const distanceSelect = distanceSql ?? Prisma.sql`NULL::double precision`;
    const skip = (query.page - 1) * query.pageSize;
    const [rows, countRows] = await Promise.all([
      this.prisma.$queryRaw<PublicPlaceListRow[]>(Prisma.sql`
        SELECT
          p.id AS "propertyId",
          pv.id AS "propertyVersionId",
          pv.name,
          pv."propertyType",
          pv.description,
          pv.district,
          pv.city,
          pv."isFree",
          pv."feeLkr",
          pv.latitude,
          pv.longitude,
          pv."submittedAt",
          ${distanceSelect} AS "distanceKm"
        FROM "Property" p
        INNER JOIN "PropertyVersion" pv ON pv.id = p."activeVersionId"
        WHERE ${whereSql}
        ${orderSql}
        LIMIT ${query.pageSize}
        OFFSET ${skip}
      `),
      this.prisma.$queryRaw<CountRow[]>(Prisma.sql`
        SELECT COUNT(*) AS count
        FROM "Property" p
        INNER JOIN "PropertyVersion" pv ON pv.id = p."activeVersionId"
        WHERE ${whereSql}
      `),
    ]);
    const relations = await this.loadVersionRelations(
      rows.map((row) => row.propertyVersionId),
    );
    const relationByVersionId = new Map(
      relations.map((relation) => [relation.id, relation]),
    );

    try {
      const total = Number(countRows[0]?.count ?? 0);

      return {
        items: rows.map((row) => {
          const relation = relationByVersionId.get(row.propertyVersionId);

          if (!relation) {
            throw new Error('Public active version relations are unavailable');
          }

          return mapPublicPlaceListItem(row, relation);
        }),
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          total,
          totalPages: Math.ceil(total / query.pageSize),
        },
        availableAmenities,
      };
    } catch {
      throw new ServiceUnavailableException('Public places are unavailable');
    }
  }

  async getPlace(propertyId: string): Promise<PublicPlaceDetailsDto> {
    const rows = await this.prisma.$queryRaw<
      PublicPlaceDetailsRow[]
    >(Prisma.sql`
      SELECT
        p.id AS "propertyId",
        pv.id AS "propertyVersionId",
        pv.name,
        pv."propertyType",
        pv.description,
        pv.address,
        pv.district,
        pv.city,
        pv."accessNotes",
        pv."isFree",
        pv."feeLkr",
        pv.phone,
        pv.email,
        pv.website,
        pv.latitude,
        pv.longitude,
        pv."submittedAt",
        NULL::double precision AS "distanceKm"
      FROM "Property" p
      INNER JOIN "PropertyVersion" pv ON pv.id = p."activeVersionId"
      WHERE ${publicEligibilitySql}
        AND p.id = ${propertyId}
      LIMIT 1
    `);
    const row = rows[0];

    if (!row) {
      throw new NotFoundException('Place not found');
    }

    const relations = await this.loadVersionRelations([row.propertyVersionId]);
    const relation = relations[0];

    if (!relation || relation.id !== row.propertyVersionId) {
      throw new NotFoundException('Place not found');
    }

    try {
      return mapPublicPlaceDetails(row, relation);
    } catch {
      throw new ServiceUnavailableException('Public place is unavailable');
    }
  }

  private assertCoordinateQuery(query: PlaceListQueryDto): void {
    const hasLatitude = query.latitude !== undefined;
    const hasLongitude = query.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      throw queryValidationError(
        'Latitude and longitude must be supplied together',
        [
          {
            field: hasLatitude ? 'longitude' : 'latitude',
            message: 'Latitude and longitude are required together',
          },
        ],
      );
    }

    if (
      (query.radiusKm !== undefined || query.sort === 'distance') &&
      !hasLatitude
    ) {
      throw queryValidationError(
        'Coordinates are required for radius and distance queries',
        [
          {
            field: 'latitude',
            message: 'Provide latitude and longitude for this query',
          },
        ],
      );
    }
  }

  private getRequiredAmenityCodes(query: PlaceListQueryDto): string[] {
    const codes = new Set(query.amenities ?? []);

    if (query.wheelchairAccessible === true) {
      codes.add(WHEELCHAIR_AMENITY_CODE);
    }

    return [...codes];
  }

  private assertActiveAmenityCodes(
    requestedCodes: string[],
    activeAmenities: PublicAmenityDto[],
  ): void {
    const activeCodes = new Set(activeAmenities.map((amenity) => amenity.code));
    const invalidCodes = requestedCodes.filter(
      (code) => !activeCodes.has(code),
    );

    if (invalidCodes.length > 0) {
      throw queryValidationError(
        'Every amenity filter must be active and recognized',
        [
          {
            field: 'amenities',
            message: 'One or more amenity codes are unavailable',
          },
        ],
      );
    }
  }

  private async listActiveAmenities(): Promise<PublicAmenityDto[]> {
    return this.prisma.amenity.findMany({
      where: { isActive: true },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
      select: { code: true, name: true },
    });
  }

  private loadVersionRelations(
    versionIds: string[],
  ): Promise<PublicVersionRelations[]> {
    if (versionIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.prisma.propertyVersion.findMany({
      where: { id: { in: versionIds } },
      select: publicVersionRelationsSelect,
    });
  }

  private getDistanceSql(query: PlaceListQueryDto): Prisma.Sql | null {
    if (query.latitude === undefined || query.longitude === undefined) {
      return null;
    }

    const latitude = query.latitude;
    const longitude = query.longitude;

    return Prisma.sql`
      (
        6371.0 * 2 * ASIN(
          SQRT(
            LEAST(
              1.0,
              GREATEST(
                0.0,
                POWER(SIN(RADIANS((pv.latitude::double precision - ${latitude}) / 2)), 2)
                + COS(RADIANS(${latitude}))
                * COS(RADIANS(pv.latitude::double precision))
                * POWER(SIN(RADIANS((pv.longitude::double precision - ${longitude}) / 2)), 2)
              )
            )
          )
        )
      )
    `;
  }

  private buildWhereSql(
    query: PlaceListQueryDto,
    amenityCodes: string[],
    distanceSql: Prisma.Sql | null,
  ): Prisma.Sql {
    const conditions: Prisma.Sql[] = [publicEligibilitySql];

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(Prisma.sql`(
        pv.name ILIKE ${pattern}
        OR pv.city ILIKE ${pattern}
        OR pv.district ILIKE ${pattern}
        OR pv.address ILIKE ${pattern}
        OR pv.description ILIKE ${pattern}
      )`);
    }
    if (query.district) {
      conditions.push(
        Prisma.sql`LOWER(pv.district) = LOWER(${query.district})`,
      );
    }
    if (query.city) {
      conditions.push(Prisma.sql`LOWER(pv.city) = LOWER(${query.city})`);
    }
    if (query.propertyType) {
      conditions.push(
        Prisma.sql`pv."propertyType" = ${query.propertyType}::"PropertyType"`,
      );
    }
    if (query.isFree !== undefined) {
      conditions.push(Prisma.sql`pv."isFree" = ${query.isFree}`);
    }

    for (const amenityCode of amenityCodes) {
      conditions.push(Prisma.sql`EXISTS (
        SELECT 1
        FROM "PropertyAmenity" pa
        INNER JOIN "Amenity" a ON a.id = pa."amenityId"
        WHERE pa."propertyVersionId" = pv.id
          AND pa.value = true
          AND a."isActive" = true
          AND a.code = ${amenityCode}
      )`);
    }

    if (
      query.radiusKm !== undefined &&
      query.latitude !== undefined &&
      query.longitude !== undefined &&
      distanceSql
    ) {
      const latitudeDelta = query.radiusKm / 111.32;
      const longitudeScale = Math.abs(
        Math.cos((query.latitude * Math.PI) / 180),
      );
      const longitudeDelta =
        longitudeScale < 0.0001
          ? 180
          : Math.min(180, query.radiusKm / (111.32 * longitudeScale));
      const minimumLatitude = Math.max(-90, query.latitude - latitudeDelta);
      const maximumLatitude = Math.min(90, query.latitude + latitudeDelta);
      conditions.push(
        Prisma.sql`pv.latitude BETWEEN ${minimumLatitude} AND ${maximumLatitude}`,
      );

      if (longitudeDelta < 180) {
        const minimumLongitude = query.longitude - longitudeDelta;
        const maximumLongitude = query.longitude + longitudeDelta;

        if (minimumLongitude < -180) {
          conditions.push(
            Prisma.sql`(pv.longitude >= ${minimumLongitude + 360} OR pv.longitude <= ${maximumLongitude})`,
          );
        } else if (maximumLongitude > 180) {
          conditions.push(
            Prisma.sql`(pv.longitude >= ${minimumLongitude} OR pv.longitude <= ${maximumLongitude - 360})`,
          );
        } else {
          conditions.push(
            Prisma.sql`pv.longitude BETWEEN ${minimumLongitude} AND ${maximumLongitude}`,
          );
        }
      }

      conditions.push(Prisma.sql`${distanceSql} <= ${query.radiusKm}`);
    }

    return Prisma.join(conditions, ' AND ');
  }

  private buildOrderSql(
    query: PlaceListQueryDto,
    distanceSql: Prisma.Sql | null,
  ): Prisma.Sql {
    if (query.sort === 'distance' && distanceSql) {
      return Prisma.sql`ORDER BY ${distanceSql} ASC, p.id ASC`;
    }
    if (query.sort === 'name_asc') {
      return Prisma.sql`ORDER BY LOWER(pv.name) ASC, p.id ASC`;
    }
    if (query.sort === 'name_desc') {
      return Prisma.sql`ORDER BY LOWER(pv.name) DESC, p.id ASC`;
    }
    if (query.sort === 'city_asc') {
      return Prisma.sql`ORDER BY LOWER(pv.city) ASC, LOWER(pv.name) ASC, p.id ASC`;
    }

    return Prisma.sql`ORDER BY pv."submittedAt" DESC, p.id ASC`;
  }
}
