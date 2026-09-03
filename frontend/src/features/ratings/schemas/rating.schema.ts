import { z } from "zod";

const scoreSchema = z.number().int().min(1).max(5);
const averageSchema = z.number().min(1).max(5).nullable();

export const facilityRatingScoresSchema = z.object({
  cleanliness: scoreSchema,
  safety: scoreSchema,
  accessibility: scoreSchema,
  accuracy: scoreSchema,
});

export const facilityRatingSchema = facilityRatingScoresSchema.extend({
  id: z.uuid(),
  reviewText: z.string().nullable(),
  visitDate: z.string().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const facilityRatingSummarySchema = z.object({
  count: z.number().int().nonnegative(),
  overall: averageSchema,
  cleanliness: averageSchema,
  safety: averageSchema,
  accessibility: averageSchema,
  accuracy: averageSchema,
});

export const nullableFacilityRatingSchema = facilityRatingSchema.nullable();

const ratingReplySchema = z.object({
  id: z.uuid(),
  message: z.string(),
  author: z.object({ id: z.uuid(), name: z.string() }),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const facilityReviewListSchema = z.object({
  items: z.array(
    facilityRatingSchema.extend({
      author: z.object({ id: z.uuid(), name: z.string() }),
      reply: ratingReplySchema.nullable(),
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export { ratingReplySchema };
