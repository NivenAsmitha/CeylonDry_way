import { z } from "zod";
import { PROPERTY_STATUSES, PROPERTY_TYPES } from "../types/property.types";
import { REVIEW_DECISIONS } from "../../reviewer/types/reviewer.types";

export const amenitySchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().nullable(),
});

export const selectedAmenitySchema = z.object({
  code: z.string(),
  name: z.string(),
  notes: z.string().nullable(),
});

export const openingHourSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  openTime: z.string().nullable(),
  closeTime: z.string().nullable(),
  isClosed: z.boolean(),
  is24Hours: z.boolean(),
});

export const propertyPhotoSchema = z.object({
  id: z.uuid(),
  url: z.string(),
  sortOrder: z.number().int(),
  isCover: z.boolean(),
  altText: z.string().nullable(),
});

const propertyVersionSchema = z.object({
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
  submittedAt: z.string().nullable(),
  amenities: z.array(selectedAmenitySchema),
  openingHours: z.array(openingHourSchema),
  photos: z.array(propertyPhotoSchema),
});

export const ownerPropertySchema = z.object({
  id: z.uuid(),
  lifecycleStatus: z.enum(PROPERTY_STATUSES),
  createdAt: z.string(),
  updatedAt: z.string(),
  canEdit: z.boolean(),
  canSubmit: z.boolean(),
  latestDecision: z
    .object({
      decision: z.enum(REVIEW_DECISIONS),
      reason: z.string().nullable(),
      createdAt: z.string(),
    })
    .nullable(),
  activeVersion: propertyVersionSchema,
});

export const ownerPropertyListSchema = z.object({
  items: z.array(ownerPropertySchema),
  total: z.number().int().nonnegative(),
});

export const amenityListSchema = z.array(amenitySchema);
