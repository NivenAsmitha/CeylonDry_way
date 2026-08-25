import { PROPERTY_TYPES } from "../../properties/types/property.types";
import {
  PLACE_SORTS,
  type PlaceSort,
  type PublicPlaceQuery,
} from "../types/place.types";

function boundedNumber(
  value: string | null,
  minimum: number,
  maximum: number,
): number | undefined {
  if (!value?.trim()) return undefined;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) &&
    numberValue >= minimum &&
    numberValue <= maximum
    ? numberValue
    : undefined;
}

function positiveInteger(
  value: string | null,
  fallback: number,
  maximum: number,
): number {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) &&
    numberValue >= 1 &&
    numberValue <= maximum
    ? numberValue
    : fallback;
}

export function parsePlaceQuery(params: URLSearchParams): PublicPlaceQuery {
  const propertyType = params.get("propertyType");
  const sortValue = params.get("sort");
  const latitude = boundedNumber(params.get("latitude"), -90, 90);
  const longitude = boundedNumber(params.get("longitude"), -180, 180);
  const hasCoordinates = latitude !== undefined && longitude !== undefined;
  const sort: PlaceSort = PLACE_SORTS.includes(sortValue as PlaceSort)
    ? (sortValue as PlaceSort)
    : "newest";

  return {
    search: params.get("search")?.trim() || undefined,
    district: params.get("district")?.trim() || undefined,
    city: params.get("city")?.trim() || undefined,
    propertyType: PROPERTY_TYPES.includes(
      propertyType as (typeof PROPERTY_TYPES)[number],
    )
      ? (propertyType as (typeof PROPERTY_TYPES)[number])
      : undefined,
    isFree:
      params.get("isFree") === "true"
        ? true
        : params.get("isFree") === "false"
          ? false
          : undefined,
    wheelchairAccessible:
      params.get("wheelchairAccessible") === "true" ? true : undefined,
    amenities:
      params
        .get("amenities")
        ?.split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean) ?? undefined,
    page: positiveInteger(params.get("page"), 1, 100_000),
    pageSize: positiveInteger(params.get("pageSize"), 12, 50),
    sort: sort === "distance" && !hasCoordinates ? "newest" : sort,
    latitude: hasCoordinates ? latitude : undefined,
    longitude: hasCoordinates ? longitude : undefined,
    radiusKm: hasCoordinates
      ? boundedNumber(params.get("radiusKm"), 0.1, 200)
      : undefined,
  };
}

export function updatePlaceParams(
  current: URLSearchParams,
  updates: Record<string, string | number | boolean | undefined>,
): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  return next;
}
