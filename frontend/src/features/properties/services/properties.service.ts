import { apiClient } from "../../../services/api";
import {
  amenityListSchema,
  ownerPropertyListSchema,
  ownerPropertySchema,
} from "../schemas/property-response.schema";
import type {
  Amenity,
  OwnerProperty,
  OwnerPropertyList,
  PropertyDraftInput,
} from "../types/property.types";

export async function listAmenities(signal?: AbortSignal): Promise<Amenity[]> {
  const response = await apiClient.get<unknown>("/owner/properties/amenities", {
    signal,
  });

  return amenityListSchema.parse(response.data);
}

export async function createPropertyDraft(
  input: PropertyDraftInput,
): Promise<OwnerProperty> {
  const response = await apiClient.post<unknown>("/owner/properties", input);

  return ownerPropertySchema.parse(response.data);
}

export async function listOwnerProperties(
  signal?: AbortSignal,
): Promise<OwnerPropertyList> {
  const response = await apiClient.get<unknown>("/owner/properties", {
    signal,
  });

  return ownerPropertyListSchema.parse(response.data);
}

export async function getOwnerProperty(
  propertyId: string,
  signal?: AbortSignal,
): Promise<OwnerProperty> {
  const response = await apiClient.get<unknown>(
    `/owner/properties/${propertyId}`,
    { signal },
  );

  return ownerPropertySchema.parse(response.data);
}

export async function updatePropertyDraft(
  propertyId: string,
  input: PropertyDraftInput,
): Promise<OwnerProperty> {
  const response = await apiClient.patch<unknown>(
    `/owner/properties/${propertyId}`,
    input,
  );

  return ownerPropertySchema.parse(response.data);
}

export async function submitPropertyDraft(
  propertyId: string,
): Promise<OwnerProperty> {
  const response = await apiClient.post<unknown>(
    `/owner/properties/${propertyId}/submit`,
    { confirm: true },
  );

  return ownerPropertySchema.parse(response.data);
}
