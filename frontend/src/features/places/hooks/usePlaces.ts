import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { normalizeApiError } from "../../../types/api.types";
import * as placesService from "../services/places.service";
import type { PublicPlaceQuery } from "../types/place.types";

export const PUBLIC_PLACES_QUERY_KEY = ["public", "places"] as const;

function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = normalizeApiError(error).statusCode;
  return failureCount < 1 && status !== 400 && status !== 404;
}

export function publicPlacesQueryKey(query: PublicPlaceQuery) {
  return [...PUBLIC_PLACES_QUERY_KEY, query] as const;
}

export function publicPlaceQueryKey(propertyId: string) {
  return [...PUBLIC_PLACES_QUERY_KEY, "detail", propertyId] as const;
}

export function usePublicPlaces(query: PublicPlaceQuery) {
  return useQuery({
    queryKey: publicPlacesQueryKey(query),
    queryFn: ({ signal }) => placesService.listPublicPlaces(query, signal),
    placeholderData: keepPreviousData,
    retry: shouldRetry,
  });
}

export function usePublicPlace(propertyId: string | undefined) {
  return useQuery({
    queryKey: publicPlaceQueryKey(propertyId ?? "missing"),
    queryFn: ({ signal }) =>
      placesService.getPublicPlace(propertyId ?? "", signal),
    enabled: Boolean(propertyId),
    retry: shouldRetry,
  });
}
