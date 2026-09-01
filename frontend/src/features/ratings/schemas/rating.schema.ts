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
