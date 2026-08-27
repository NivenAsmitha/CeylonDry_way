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

export async function uploadPropertyPhotos(
  propertyId: string,
  files: readonly File[],
  onProgress?: (percentage: number) => void,
): Promise<PropertyPhoto[]> {
  const formData = new FormData();
  for (const file of files) formData.append("photos", file);

  const response = await apiClient.post<unknown>(
    `/owner/properties/${propertyId}/photos`,
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
): Promise<PropertyPhoto[]> {
  const response = await apiClient.patch<unknown>(
    `/owner/properties/${propertyId}/photos/reorder`,
    { photoIds },
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function setPropertyPhotoCover(
  propertyId: string,
  photoId: string,
): Promise<PropertyPhoto[]> {
  const response = await apiClient.patch<unknown>(
    `/owner/properties/${propertyId}/photos/${photoId}/cover`,
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function updatePropertyPhotoAltText(
  propertyId: string,
  photoId: string,
  altText: string | null,
): Promise<PropertyPhoto[]> {
  const response = await apiClient.patch<unknown>(
    `/owner/properties/${propertyId}/photos/${photoId}`,
    { altText },
  );
  return propertyPhotoListSchema.parse(response.data);
}

export async function removePropertyPhoto(
  propertyId: string,
  photoId: string,
): Promise<PropertyPhoto[]> {
  const response = await apiClient.delete<unknown>(
    `/owner/properties/${propertyId}/photos/${photoId}`,
  );
  return propertyPhotoListSchema.parse(response.data);
}
