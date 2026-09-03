import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PRIVATE_QUERY_KEY } from "../../../services/queryClient";
import * as ratingsService from "../services/ratings.service";
import type { FacilityRatingInput } from "../types/rating.types";

const PUBLIC_RATINGS_QUERY_KEY = ["public", "facility-ratings"] as const;

export function ratingSummaryQueryKey(propertyId: string) {
  return [...PUBLIC_RATINGS_QUERY_KEY, propertyId] as const;
}

export function myRatingQueryKey(propertyId: string) {
  return [...PRIVATE_QUERY_KEY, "facility-rating", propertyId] as const;
}

export function useRatingSummary(propertyId: string) {
  return useQuery({
    queryKey: ratingSummaryQueryKey(propertyId),
    queryFn: ({ signal }) =>
      ratingsService.getRatingSummary(propertyId, signal),
  });
}

export function useMyRating(propertyId: string, enabled: boolean) {
  return useQuery({
    queryKey: myRatingQueryKey(propertyId),
    queryFn: ({ signal }) => ratingsService.getMyRating(propertyId, signal),
    enabled,
  });
}

export function useSaveRating(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scores: FacilityRatingInput) =>
      ratingsService.saveMyRating(propertyId, scores),
    onSuccess: async (rating) => {
      queryClient.setQueryData(myRatingQueryKey(propertyId), rating);
      await queryClient.invalidateQueries({
        queryKey: ratingSummaryQueryKey(propertyId),
      });
      await queryClient.invalidateQueries({
        queryKey: [...PUBLIC_RATINGS_QUERY_KEY, propertyId, "reviews"],
      });
    },
  });
}

export function useFacilityReviews(propertyId: string, page = 1) {
  return useQuery({
    queryKey: [...PUBLIC_RATINGS_QUERY_KEY, propertyId, "reviews", page],
    queryFn: ({ signal }) =>
      ratingsService.getFacilityReviews(propertyId, page, signal),
  });
}

export function useSaveOwnerReply(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, message }: { reviewId: string; message: string }) =>
      ratingsService.saveOwnerReply(reviewId, message),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...PUBLIC_RATINGS_QUERY_KEY, propertyId, "reviews"],
      }),
  });
}

export function useDeleteOwnerReply(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => ratingsService.deleteOwnerReply(reviewId),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: [...PUBLIC_RATINGS_QUERY_KEY, propertyId, "reviews"],
      }),
  });
}

export function useDeleteRating(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => ratingsService.deleteMyRating(propertyId),
    onSuccess: async () => {
      queryClient.setQueryData(myRatingQueryKey(propertyId), null);
      await queryClient.invalidateQueries({
        queryKey: ratingSummaryQueryKey(propertyId),
      });
    },
  });
}
