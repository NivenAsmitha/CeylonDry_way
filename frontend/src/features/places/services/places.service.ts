import { apiClient } from "../../../services/api";
import {
  publicPlaceDetailsSchema,
  publicPlaceListResponseSchema,
} from "../schemas/place-response.schema";
import type {
  PublicPlaceDetails,
  PublicPlaceListResponse,
  PublicPlaceQuery,
} from "../types/place.types";

function makeQueryParams(query: PublicPlaceQuery): URLSearchParams {
  const params = new URLSearchParams();

  for (const key of ["search", "district", "city"] as const) {
    const value = query[key]?.trim();
    if (value) params.set(key, value);
  }
  if (query.propertyType) params.set("propertyType", query.propertyType);
  if (query.isFree !== undefined) params.set("isFree", String(query.isFree));
  if (query.wheelchairAccessible !== undefined) {
    params.set(
      "wheelchairAccessible",
      String(query.wheelchairAccessible),
    );
  }
  if (query.amenities?.length) {
    params.set("amenities", query.amenities.join(","));
  }
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  params.set("sort", query.sort);
  if (query.latitude !== undefined) {
    params.set("latitude", String(query.latitude));
  }
  if (query.longitude !== undefined) {
    params.set("longitude", String(query.longitude));
  }
  if (query.radiusKm !== undefined) {
    params.set("radiusKm", String(query.radiusKm));
  }

  return params;
}

export async function listPublicPlaces(
  query: PublicPlaceQuery,
  signal?: AbortSignal,
): Promise<PublicPlaceListResponse> {
  const response = await apiClient.get<unknown>("/places", {
    params: makeQueryParams(query),
    signal,
  });

  return publicPlaceListResponseSchema.parse(response.data);
}

export async function getPublicPlace(
  propertyId: string,
  signal?: AbortSignal,
): Promise<PublicPlaceDetails> {
  const response = await apiClient.get<unknown>(`/places/${propertyId}`, {
    signal,
  });

  return publicPlaceDetailsSchema.parse(response.data);
}
