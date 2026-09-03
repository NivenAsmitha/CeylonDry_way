import { z } from "zod";
import { apiClient } from "../../services/api";

export const REVIEW_MODERATION_STATUSES = ["VISIBLE", "HIDDEN"] as const;
export type ReviewModerationStatus =
  (typeof REVIEW_MODERATION_STATUSES)[number];
export type ReviewModerationAction = "HIDE" | "RESTORE";

const staffReviewListSchema = z.object({
  items: z.array(
    z.object({
      id: z.uuid(),
      cleanliness: z.number().int(),
      safety: z.number().int(),
      accessibility: z.number().int(),
      accuracy: z.number().int(),
      reviewText: z.string().nullable(),
      visitDate: z.string().nullable(),
      createdAt: z.iso.datetime(),
      updatedAt: z.iso.datetime(),
      moderationStatus: z.enum(REVIEW_MODERATION_STATUSES),
      moderationReason: z.string().nullable(),
      moderatedAt: z.iso.datetime().nullable(),
      author: z.object({ id: z.uuid(), name: z.string(), email: z.email() }),
      property: z.object({
        id: z.uuid(),
        ownerUserId: z.uuid(),
        activeVersion: z
          .object({ name: z.string().nullable(), city: z.string().nullable() })
          .nullable(),
      }),
      reply: z
        .object({
          id: z.uuid(),
          message: z.string(),
          moderationStatus: z.enum(REVIEW_MODERATION_STATUSES),
          moderationReason: z.string().nullable(),
          createdAt: z.iso.datetime(),
          updatedAt: z.iso.datetime(),
          author: z.object({ id: z.uuid(), name: z.string() }),
        })
        .nullable(),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type StaffReviewList = z.infer<typeof staffReviewListSchema>;

export async function listStaffReviews(
  query: {
    search?: string;
    status?: ReviewModerationStatus;
    page?: number;
  },
  signal?: AbortSignal,
): Promise<StaffReviewList> {
  const response = await apiClient.get<unknown>("/staff/reviews", {
    params: query,
    signal,
  });
  return staffReviewListSchema.parse(response.data);
}

export async function moderateReview(
  reviewId: string,
  action: ReviewModerationAction,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/staff/reviews/${reviewId}/moderation`, {
    action,
    reason,
  });
}

export async function moderateOwnerReply(
  replyId: string,
  action: ReviewModerationAction,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/staff/reviews/replies/${replyId}/moderation`, {
    action,
    reason,
  });
}
