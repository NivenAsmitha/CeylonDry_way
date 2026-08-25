import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PRIVATE_QUERY_KEY } from "../../../services/queryClient";
import * as reviewerService from "../services/reviewer.service";
import type {
  ReviewDecisionInput,
  ReviewerQueueQuery,
  ReviewerQueueResponse,
} from "../types/reviewer.types";

export const REVIEWER_QUEUE_QUERY_KEY = [
  ...PRIVATE_QUERY_KEY,
  "reviewer-listings",
] as const;

export function reviewerQueueQueryKey(query: ReviewerQueueQuery) {
  return [...REVIEWER_QUEUE_QUERY_KEY, query] as const;
}

export function reviewerListingQueryKey(propertyId: string) {
  return [...REVIEWER_QUEUE_QUERY_KEY, "detail", propertyId] as const;
}

export function useReviewerListings(query: ReviewerQueueQuery) {
  return useQuery({
    queryKey: reviewerQueueQueryKey(query),
    queryFn: ({ signal }) =>
      reviewerService.listReviewerListings(query, signal),
  });
}

export function useReviewerListing(propertyId: string | undefined) {
  return useQuery({
    queryKey: reviewerListingQueryKey(propertyId ?? "missing"),
    queryFn: ({ signal }) =>
      reviewerService.getReviewerListing(propertyId ?? "", signal),
    enabled: Boolean(propertyId),
  });
}

export function useReviewDecision(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReviewDecisionInput) =>
      reviewerService.decideReviewerListing(propertyId, input),
    onSuccess: async (listing) => {
      queryClient.setQueryData(reviewerListingQueryKey(propertyId), listing);
      queryClient.setQueriesData<ReviewerQueueResponse>(
        { queryKey: REVIEWER_QUEUE_QUERY_KEY },
        (current) =>
          current
            ? {
                ...current,
                items: current.items.filter(
                  (item) => item.propertyId !== propertyId,
                ),
              }
            : current,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: REVIEWER_QUEUE_QUERY_KEY }),
        queryClient.invalidateQueries({
          queryKey: reviewerListingQueryKey(propertyId),
        }),
      ]);
    },
  });
}
