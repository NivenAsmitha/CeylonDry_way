import { apiClient } from "../../../services/api";
import {
  facilityRatingSchema,
  facilityRatingSummarySchema,
  nullableFacilityRatingSchema,
} from "../schemas/rating.schema";
import type {
  FacilityRating,
  FacilityRatingScores,
  FacilityRatingSummary,
} from "../types/rating.types";

export async function getRatingSummary(
  propertyId: string,
  signal?: AbortSignal,
): Promise<FacilityRatingSummary> {
  const response = await apiClient.get<unknown>(
    `/places/${propertyId}/ratings`,
    { signal },
  );
  return facilityRatingSummarySchema.parse(response.data);
}

export async function getMyRating(
  propertyId: string,
  signal?: AbortSignal,
): Promise<FacilityRating | null> {
  const response = await apiClient.get<unknown>(
    `/places/${propertyId}/ratings/me`,
    { signal },
  );
  return nullableFacilityRatingSchema.parse(response.data);
}

export async function saveMyRating(
  propertyId: string,
  scores: FacilityRatingScores,
): Promise<FacilityRating> {
  const response = await apiClient.put<unknown>(
    `/places/${propertyId}/ratings/me`,
    scores,
  );
  return facilityRatingSchema.parse(response.data);
}

export async function deleteMyRating(propertyId: string): Promise<void> {
  await apiClient.delete(`/places/${propertyId}/ratings/me`);
}
