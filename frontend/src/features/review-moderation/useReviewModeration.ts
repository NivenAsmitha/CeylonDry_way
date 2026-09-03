import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as service from "./review-moderation.service";
import type {
  ReviewModerationAction,
  ReviewModerationStatus,
} from "./review-moderation.service";

const STAFF_REVIEWS_KEY = ["private", "staff-reviews"] as const;

export function useStaffReviews(query: {
  search?: string;
  status?: ReviewModerationStatus;
  page?: number;
}) {
  return useQuery({
    queryKey: [...STAFF_REVIEWS_KEY, query],
    queryFn: ({ signal }) => service.listStaffReviews(query, signal),
  });
}

export function useModerateReviewContent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      target: "review" | "reply";
      id: string;
      action: ReviewModerationAction;
      reason: string;
    }) =>
      input.target === "review"
        ? service.moderateReview(input.id, input.action, input.reason)
        : service.moderateOwnerReply(input.id, input.action, input.reason),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: STAFF_REVIEWS_KEY }),
  });
}
