import { z } from "zod";
import {
  openingHourSchema,
  propertyPhotoSchema,
  selectedAmenitySchema,
} from "../../properties/schemas/property-response.schema";
import {
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
} from "../../properties/types/property.types";
import { REVIEW_DECISIONS } from "../types/reviewer.types";

const ownerSummarySchema = z.object({ name: z.string() });

const reviewFieldNoteSchema = z.object({
  field: z.string(),
  message: z.string(),
});

export const reviewerQueueResponseSchema = z.object({
  items: z.array(
    z.object({
      propertyId: z.uuid(),
      propertyVersionId: z.uuid(),
      version: z.number().int().positive(),
      name: z.string().nullable(),
      propertyType: z.enum(PROPERTY_TYPES).nullable(),
      district: z.string().nullable(),
      city: z.string().nullable(),
      lifecycleStatus: z.enum(PROPERTY_STATUSES),
      submittedAt: z.string(),
      owner: ownerSummarySchema,
    }),
  ),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(50),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export const reviewerListingSchema = z.object({
  propertyId: z.uuid(),
  lifecycleStatus: z.enum(PROPERTY_STATUSES),
  owner: ownerSummarySchema,
  submittedVersion: z.object({
    id: z.uuid(),
    version: z.number().int().positive(),
    propertyType: z.enum(PROPERTY_TYPES).nullable(),
    name: z.string().nullable(),
    organisation: z.string().nullable(),
    description: z.string().nullable(),
    accessNotes: z.string().nullable(),
    isFree: z.boolean(),
    feeLkr: z.number().nonnegative().nullable(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    website: z.string().nullable(),
    address: z.string().nullable(),
    district: z.string().nullable(),
    city: z.string().nullable(),
    latitude: z.number().min(-90).max(90).nullable(),
    longitude: z.number().min(-180).max(180).nullable(),
    submittedAt: z.string(),
    amenities: z.array(selectedAmenitySchema),
    openingHours: z.array(openingHourSchema),
    photos: z.array(propertyPhotoSchema),
  }),
  allowedDecisions: z.array(z.enum(REVIEW_DECISIONS)),
  decisionHistory: z.array(
    z.object({
      id: z.uuid(),
      decision: z.enum(REVIEW_DECISIONS),
      reason: z.string().nullable(),
      fieldNotes: z.array(reviewFieldNoteSchema).nullable(),
      createdAt: z.string(),
      reviewer: ownerSummarySchema,
    }),
  ),
});
