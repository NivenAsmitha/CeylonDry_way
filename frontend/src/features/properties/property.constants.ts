import type { PropertyStatus, PropertyType } from "./types/property.types";

export const PROPERTY_FORM_STEPS = [
  "Basic details",
  "Amenities",
  "Access and fee",
  "Contact",
  "Location",
  "Photos",
  "Review and submit",
] as const;

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOTEL: "Hotel",
  RESTAURANT: "Restaurant",
  TOURIST_SITE: "Tourist site",
  PUBLIC_FACILITY: "Public facility",
  SERVICE_STATION: "Service station",
  OTHER: "Other",
};

export function getPropertyStatusLabel(status: PropertyStatus): string {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
    .join(" ");
}
