import { apiClient } from "../../../services/api";
import {
  reviewerListingSchema,
  reviewerQueueResponseSchema,
} from "../schemas/reviewer-response.schema";
import type {
  ReviewDecisionInput,
  ReviewerListing,
  ReviewerQueueQuery,
  ReviewerQueueResponse,
} from "../types/reviewer.types";

export async function listReviewerListings(
  query: ReviewerQueueQuery,
  signal?: AbortSignal,
): Promise<ReviewerQueueResponse> {
  const response = await apiClient.get<unknown>("/reviewer/listings", {
    params: query,
    signal,
  });

  return reviewerQueueResponseSchema.parse(response.data);
}

export async function getReviewerListing(
  propertyId: string,
  signal?: AbortSignal,
): Promise<ReviewerListing> {
  const response = await apiClient.get<unknown>(
    `/reviewer/listings/${propertyId}`,
    { signal },
  );

  return reviewerListingSchema.parse(response.data);
}

export async function decideReviewerListing(
  propertyId: string,
  input: ReviewDecisionInput,
): Promise<ReviewerListing> {
  const response = await apiClient.post<unknown>(
    `/reviewer/listings/${propertyId}/decision`,
    input,
  );

  return reviewerListingSchema.parse(response.data);
}
