export const PROPERTY_TYPES = [
  "HOTEL",
  "RESTAURANT",
  "TOURIST_SITE",
  "PUBLIC_FACILITY",
  "SERVICE_STATION",
  "OTHER",
] as const;

export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_STATUSES = [
  "DRAFT",
  "PENDING",
  "CHANGES_REQUESTED",
  "APPROVED",
  "PENDING_UPDATE",
  "UPDATE_CHANGES_REQUESTED",
  "REJECTED",
  "SUSPENDED",
  "ARCHIVED",
] as const;

export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];

export interface Amenity {
  code: string;
  name: string;
  description: string | null;
}

export interface SelectedAmenity {
  code: string;
  name: string;
  notes: string | null;
}

export interface OpeningHour {
  weekday: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  is24Hours: boolean;
}

export interface PropertyPhoto {
  id: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
  altText: string | null;
}

export interface PropertyVersion {
  id: string;
  version: number;
  propertyType: PropertyType | null;
  name: string | null;
  organisation: string | null;
  description: string | null;
  accessNotes: string | null;
  isFree: boolean;
  feeLkr: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  district: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  submittedAt: string | null;
  amenities: SelectedAmenity[];
  openingHours: OpeningHour[];
  photos: PropertyPhoto[];
}

export interface OwnerProperty {
  id: string;
  lifecycleStatus: PropertyStatus;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canSubmit: boolean;
  canStartRevision: boolean;
  latestDecision: {
    decision: ReviewDecisionType;
    reason: string | null;
    createdAt: string;
  } | null;
  activeVersion: PropertyVersion;
}

export interface OwnerPropertyList {
  items: OwnerProperty[];
  total: number;
}

export interface OpeningHourInput {
  weekday: number;
  openTime?: string | null;
  closeTime?: string | null;
  isClosed: boolean;
  is24Hours: boolean;
}

export interface PropertyDraftInput {
  propertyType?: PropertyType | null;
  name?: string | null;
  organisation?: string | null;
  description?: string | null;
  accessNotes?: string | null;
  isFree?: boolean;
  feeLkr?: number | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  amenityCodes?: string[];
  openingHours?: OpeningHourInput[];
}
import type { ReviewDecisionType } from "../../reviewer/types/reviewer.types";
