import { apiClient } from "../../../services/api";
import {
  amenityListSchema,
  ownerPropertyListSchema,
  ownerPropertySchema,
  propertyPhotoListSchema,
} from "../schemas/property-response.schema";
import type {
  Amenity,
  OwnerProperty,
  OwnerPropertyList,
  PropertyDraftInput,
  PropertyPhoto,
} from "../types/property.types";

export type PropertyWorkflow = "owner" | "reviewer";

function propertyPath(workflow: PropertyWorkflow): string {
  return workflow === "reviewer" ? "/reviewer/properties" : "/owner/properties";
}

export async function listAmenities(signal?: AbortSignal): Promise<Amenity[]> {
  const response = await apiClient.get<unknown>("/owner/properties/amenities", {
    signal,
  });

  return amenityListSchema.parse(response.data);
}

export async function createPropertyDraft(
  input: PropertyDraftInput,
  workflow: PropertyWorkflow = "owner",
): Promise<OwnerProperty> {
  const response = await apiClient.post<unknown>(propertyPath(workflow), input);

  return ownerPropertySchema.parse(response.data);
}

export async function listOwnerProperties(
  signal?: AbortSignal,
  workflow: PropertyWorkflow = "owner",
): Promise<OwnerPropertyList> {
  const response = await apiClient.get<unknown>(propertyPath(workflow), {
    signal,
  });

  return ownerPropertyListSchema.parse(response.data);
}

export async function getOwnerProperty(
  propertyId: string,
  signal?: AbortSignal,
  workflow: PropertyWorkflow = "owner",
): Promise<OwnerProperty> {
  const response = await apiClient.get<unknown>(
    `${propertyPath(workflow)}/${propertyId}`,
    { signal },
  );

  return ownerPropertySchema.parse(response.data);
}

export async function updatePropertyDraft(
  propertyId: string,
  input: PropertyDraftInput,
  workflow: PropertyWorkflow = "owner",
): Promise<OwnerProperty> {
  const response = await apiClient.patch<unknown>(
    `${propertyPath(workflow)}/${propertyId}`,
    input,
  );

  return ownerPropertySchema.parse(response.data);
}

export async function startPropertyRevision(
  propertyId: string,
): Promise<OwnerProperty> {
  const response = await apiClient.post<unknown>(
    `/owner/properties/${propertyId}/revision`,
  );

  return ownerPropertySchema.parse(response.data);
}

export async function submitPropertyDraft(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
): Promise<OwnerProperty> {
  const response = await apiClient.post<unknown>(
    `${propertyPath(workflow)}/${propertyId}/submit`,
    { confirm: true },
  );

  return ownerPropertySchema.parse(response.data);
}

export async function uploadPropertyPhotos(
  propertyId: string,
  files: readonly File[],
  onProgress?: (percentage: number) => void,
  workflow: PropertyWorkflow = "owner",
): Promise<PropertyPhoto[]> {
  const formData = new FormData();
  for (const file of files) formData.append("photos", file);

  const response = await apiClient.post<unknown>(
    `${propertyPath(workflow)}/${propertyId}/photos`,
    formData,
    {
      _authenticationRetry: true,
      onUploadProgress: (event) => {
        if (!event.total || !onProgress) return;
        onProgress(
          Math.min(100, Math.round((event.loaded / event.total) * 100)),
        );
      },
    },
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function reorderPropertyPhotos(
  propertyId: string,
  photoIds: readonly string[],
  workflow: PropertyWorkflow = "owner",
): Promise<PropertyPhoto[]> {
  const response = await apiClient.patch<unknown>(
    `${propertyPath(workflow)}/${propertyId}/photos/reorder`,
    { photoIds },
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function setPropertyPhotoCover(
  propertyId: string,
  photoId: string,
  workflow: PropertyWorkflow = "owner",
): Promise<PropertyPhoto[]> {
  const response = await apiClient.patch<unknown>(
    `${propertyPath(workflow)}/${propertyId}/photos/${photoId}/cover`,
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function updatePropertyPhotoAltText(
  propertyId: string,
  photoId: string,
  altText: string | null,
  workflow: PropertyWorkflow = "owner",
): Promise<PropertyPhoto[]> {
  const response = await apiClient.patch<unknown>(
    `${propertyPath(workflow)}/${propertyId}/photos/${photoId}`,
    { altText },
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function removePropertyPhoto(
  propertyId: string,
  photoId: string,
  workflow: PropertyWorkflow = "owner",
): Promise<PropertyPhoto[]> {
  const response = await apiClient.delete<unknown>(
    `${propertyPath(workflow)}/${propertyId}/photos/${photoId}`,
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function deleteOwnedProperty(propertyId: string): Promise<void> {
  await apiClient.delete(`/owner/properties/${propertyId}`);
}
