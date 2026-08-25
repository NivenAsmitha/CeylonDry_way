import { Prisma, PropertyType } from '../../generated/prisma/client.js';
import type {
  PublicPhotoDto,
  PublicPlaceDetailsDto,
  PublicPlaceListItemDto,
} from './dto/place-response.dto';

type NumericValue = Prisma.Decimal | number | string;

export interface PublicPlaceListRow {
  propertyId: string;
  propertyVersionId: string;
  name: string;
  propertyType: PropertyType;
  description: string | null;
  district: string;
  city: string;
  isFree: boolean;
  feeLkr: NumericValue | null;
  latitude: NumericValue;
  longitude: NumericValue;
  submittedAt: Date;
  distanceKm: NumericValue | null;
}

export interface PublicPlaceDetailsRow extends PublicPlaceListRow {
  address: string;
  accessNotes: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export const publicVersionRelationsSelect = {
  id: true,
  amenities: {
    where: {
      value: true,
      amenity: { isActive: true },
    },
    select: {
      amenity: { select: { code: true, name: true } },
    },
    orderBy: { amenity: { name: 'asc' as const } },
  },
  openingHours: {
    select: {
      weekday: true,
      openTime: true,
      closeTime: true,
      isClosed: true,
      is24Hours: true,
    },
    orderBy: { weekday: 'asc' as const },
  },
  photos: {
    select: {
      url: true,
      altText: true,
      isCover: true,
      sortOrder: true,
    },
    orderBy: [{ isCover: 'desc' as const }, { sortOrder: 'asc' as const }],
  },
} satisfies Prisma.PropertyVersionSelect;

export type PublicVersionRelations = Prisma.PropertyVersionGetPayload<{
  select: typeof publicVersionRelationsSelect;
}>;

function toNumber(value: NumericValue): number {
  const numberValue =
    value instanceof Prisma.Decimal ? value.toNumber() : Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error('Public place contains an invalid numeric value');
  }

  return numberValue;
}

function toCoordinateText(value: NumericValue): string {
  const text =
    value instanceof Prisma.Decimal ? value.toString() : String(value);
  const numberValue = Number(text);

  if (!Number.isFinite(numberValue)) {
    throw new Error('Public place contains invalid coordinates');
  }

  return text;
}

function isSafePhotoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function mapPhotos(relations: PublicVersionRelations): PublicPhotoDto[] {
  return relations.photos
    .filter((photo) => isSafePhotoUrl(photo.url))
    .map((photo) => ({
      url: photo.url,
      altText: photo.altText,
      isCover: photo.isCover,
    }));
}

function getShortDescription(description: string | null): string | null {
  if (!description) {
    return null;
  }

  return description.length > 180
    ? `${description.slice(0, 177).trimEnd()}...`
    : description;
}

function mapListFields(
  row: PublicPlaceListRow,
  relations: PublicVersionRelations,
): PublicPlaceListItemDto {
  const photos = mapPhotos(relations);
  const amenities = relations.amenities.map((selection) => ({
    code: selection.amenity.code,
    name: selection.amenity.name,
  }));

  return {
    propertyId: row.propertyId,
    name: row.name,
    propertyType: row.propertyType,
    shortDescription: getShortDescription(row.description),
    district: row.district,
    city: row.city,
    isFree: row.isFree,
    feeLkr: row.isFree || row.feeLkr === null ? null : toNumber(row.feeLkr),
    wheelchairAccessible: amenities.some(
      (amenity) => amenity.code === 'WHEELCHAIR_ACCESS',
    ),
    amenities,
    coverImage: photos.find((photo) => photo.isCover) ?? photos[0] ?? null,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    distanceKm:
      row.distanceKm === null
        ? null
        : Math.round(toNumber(row.distanceKm) * 100) / 100,
    verified: true,
  };
}

export function mapPublicPlaceListItem(
  row: PublicPlaceListRow,
  relations: PublicVersionRelations,
): PublicPlaceListItemDto {
  if (row.propertyVersionId !== relations.id) {
    throw new Error('Public place relation does not match its active version');
  }

  return mapListFields(row, relations);
}

export function mapPublicPlaceDetails(
  row: PublicPlaceDetailsRow,
  relations: PublicVersionRelations,
): PublicPlaceDetailsDto {
  if (row.propertyVersionId !== relations.id) {
    throw new Error('Public place relation does not match its active version');
  }

  const latitudeText = toCoordinateText(row.latitude);
  const longitudeText = toCoordinateText(row.longitude);
  const directionsUrl = new URL('https://www.google.com/maps/dir/');
  directionsUrl.searchParams.set('api', '1');
  directionsUrl.searchParams.set(
    'destination',
    `${latitudeText},${longitudeText}`,
  );

  return {
    ...mapListFields(row, relations),
    description: row.description,
    address: row.address,
    accessNotes: row.accessNotes,
    phone: row.phone,
    email: row.email,
    website: row.website,
    openingHours: relations.openingHours.map((openingHour) => ({
      weekday: openingHour.weekday,
      openTime: openingHour.openTime,
      closeTime: openingHour.closeTime,
      isClosed: openingHour.isClosed,
      is24Hours: openingHour.is24Hours,
    })),
    photos: mapPhotos(relations),
    directionsUrl: directionsUrl.toString(),
  };
}
