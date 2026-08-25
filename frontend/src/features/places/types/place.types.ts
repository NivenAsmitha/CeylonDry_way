import type { PropertyType } from "../../properties/types/property.types";

export const PLACE_SORTS = [
  "newest",
  "name_asc",
  "name_desc",
  "city_asc",
  "distance",
] as const;

export type PlaceSort = (typeof PLACE_SORTS)[number];

export interface PublicPlaceQuery {
  search?: string;
  district?: string;
  city?: string;
  propertyType?: PropertyType;
  isFree?: boolean;
  wheelchairAccessible?: boolean;
  amenities?: string[];
  page: number;
  pageSize: number;
  sort: PlaceSort;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
}

export interface PublicAmenity {
  code: string;
  name: string;
}

export interface PublicPhoto {
  url: string;
  altText: string | null;
  isCover: boolean;
}

export interface PublicOpeningHour {
  weekday: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  is24Hours: boolean;
}

export interface PublicPlaceListItem {
  propertyId: string;
  name: string;
  propertyType: PropertyType;
  shortDescription: string | null;
  district: string;
  city: string;
  isFree: boolean;
  feeLkr: number | null;
  wheelchairAccessible: boolean;
  amenities: PublicAmenity[];
  coverImage: PublicPhoto | null;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  verified: true;
}

export interface PublicPlaceDetails extends PublicPlaceListItem {
  description: string | null;
  address: string;
  accessNotes: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  openingHours: PublicOpeningHour[];
  photos: PublicPhoto[];
  directionsUrl: string;
}

export interface PublicPlaceListResponse {
  items: PublicPlaceListItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  availableAmenities: PublicAmenity[];
}
