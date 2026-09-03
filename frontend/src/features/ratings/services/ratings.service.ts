import { apiClient } from "../../../services/api";
import {
  facilityRatingSchema,
  facilityReviewListSchema,
  facilityRatingSummarySchema,
  nullableFacilityRatingSchema,
  ratingReplySchema,
} from "../schemas/rating.schema";
import type {
  FacilityRating,
  FacilityRatingInput,
  FacilityReviewList,
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
  scores: FacilityRatingInput,
): Promise<FacilityRating> {
  const response = await apiClient.put<unknown>(
    `/places/${propertyId}/ratings/me`,
    scores,
  );
  return facilityRatingSchema.parse(response.data);
}

export async function getFacilityReviews(
  propertyId: string,
  page = 1,
  signal?: AbortSignal,
): Promise<FacilityReviewList> {
  const response = await apiClient.get<unknown>(
    `/places/${propertyId}/ratings/reviews`,
    { params: { page, pageSize: 10 }, signal },
  );
  return facilityReviewListSchema.parse(response.data);
}

export async function saveOwnerReply(reviewId: string, message: string) {
  const response = await apiClient.put<unknown>(`/reviews/${reviewId}/reply`, {
    message,
  });
  return ratingReplySchema.parse(response.data);
}

export async function deleteOwnerReply(reviewId: string): Promise<void> {
  await apiClient.delete(`/reviews/${reviewId}/reply`);
}

export async function deleteMyRating(propertyId: string): Promise<void> {
  await apiClient.delete(`/places/${propertyId}/ratings/me`);
}
