import { z } from "zod";
import { PROPERTY_TYPES } from "../../properties/types/property.types";

const publicAmenitySchema = z.object({
  code: z.string(),
  name: z.string(),
});

const publicPhotoSchema = z.object({
  url: z.url(),
  altText: z.string().nullable(),
  isCover: z.boolean(),
});

const publicPlaceListItemSchema = z.object({
  propertyId: z.uuid(),
  name: z.string(),
  propertyType: z.enum(PROPERTY_TYPES),
  shortDescription: z.string().nullable(),
  district: z.string(),
  city: z.string(),
  isFree: z.boolean(),
  feeLkr: z.number().nonnegative().nullable(),
  wheelchairAccessible: z.boolean(),
  amenities: z.array(publicAmenitySchema),
  coverImage: publicPhotoSchema.nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  distanceKm: z.number().nonnegative().nullable(),
  verified: z.literal(true),
});

export const publicPlaceListResponseSchema = z.object({
  items: z.array(publicPlaceListItemSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(50),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
  availableAmenities: z.array(publicAmenitySchema),
});

export const publicPlaceDetailsSchema = publicPlaceListItemSchema.extend({
  description: z.string().nullable(),
  address: z.string(),
  accessNotes: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  openingHours: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      openTime: z.string().nullable(),
      closeTime: z.string().nullable(),
      isClosed: z.boolean(),
      is24Hours: z.boolean(),
    }),
  ),
  photos: z.array(publicPhotoSchema),
  directionsUrl: z.url(),
});
