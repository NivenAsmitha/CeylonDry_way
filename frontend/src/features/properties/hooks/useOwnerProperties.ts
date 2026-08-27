import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/hooks/useAuth";
import { PRIVATE_QUERY_KEY } from "../../../services/queryClient";
import * as propertiesService from "../services/properties.service";
import type {
  OwnerProperty,
  PropertyDraftInput,
  PropertyPhoto,
} from "../types/property.types";

export const OWNER_PROPERTIES_QUERY_KEY = [
  ...PRIVATE_QUERY_KEY,
  "owner-properties",
] as const;
export const PROPERTY_AMENITIES_QUERY_KEY = [
  ...PRIVATE_QUERY_KEY,
  "property-amenities",
] as const;

export function ownerPropertyQueryKey(propertyId: string) {
  return [...OWNER_PROPERTIES_QUERY_KEY, propertyId] as const;
}

export function usePropertyAmenities() {
  return useQuery({
    queryKey: PROPERTY_AMENITIES_QUERY_KEY,
    queryFn: ({ signal }) => propertiesService.listAmenities(signal),
    staleTime: 5 * 60_000,
  });
}

export function useOwnerProperties() {
  return useQuery({
    queryKey: OWNER_PROPERTIES_QUERY_KEY,
    queryFn: ({ signal }) => propertiesService.listOwnerProperties(signal),
  });
}

export function useOwnerProperty(propertyId: string | undefined) {
  return useQuery({
    queryKey: ownerPropertyQueryKey(propertyId ?? "missing"),
    queryFn: ({ signal }) =>
      propertiesService.getOwnerProperty(propertyId ?? "", signal),
    enabled: Boolean(propertyId),
  });
}

export function useCreatePropertyDraft() {
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();

  return useMutation({
    mutationFn: (input: PropertyDraftInput) =>
      propertiesService.createPropertyDraft(input),
    onSuccess: async (property) => {
      queryClient.setQueryData(ownerPropertyQueryKey(property.id), property);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: OWNER_PROPERTIES_QUERY_KEY }),
        refetchUser(),
      ]);
    },
  });
}

export function useUpdatePropertyDraft(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PropertyDraftInput) =>
      propertiesService.updatePropertyDraft(propertyId, input),
    onSuccess: async (property) => {
      queryClient.setQueryData(ownerPropertyQueryKey(property.id), property);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerPropertyQueryKey(propertyId),
        }),
        queryClient.invalidateQueries({
          queryKey: OWNER_PROPERTIES_QUERY_KEY,
        }),
      ]);
    },
  });
}

export function useSubmitPropertyDraft(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => propertiesService.submitPropertyDraft(propertyId),
    onSuccess: async (property) => {
      queryClient.setQueryData(ownerPropertyQueryKey(property.id), property);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerPropertyQueryKey(propertyId),
        }),
        queryClient.invalidateQueries({
          queryKey: OWNER_PROPERTIES_QUERY_KEY,
        }),
      ]);
    },
  });
}

function usePhotoMutation<TInput>(
  propertyId: string,
  mutationFn: (input: TInput) => Promise<PropertyPhoto[]>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (photos) => {
      queryClient.setQueryData<OwnerProperty>(
        ownerPropertyQueryKey(propertyId),
        (property) =>
          property
            ? {
                ...property,
                activeVersion: { ...property.activeVersion, photos },
              }
            : property,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerPropertyQueryKey(propertyId),
        }),
        queryClient.invalidateQueries({
          queryKey: OWNER_PROPERTIES_QUERY_KEY,
        }),
      ]);
    },
  });
}

export function useUploadPropertyPhotos(propertyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      onProgress,
    }: {
      files: readonly File[];
      onProgress?: (percentage: number) => void;
    }) => propertiesService.uploadPropertyPhotos(propertyId, files, onProgress),
    onSuccess: async (photos) => {
      queryClient.setQueryData<OwnerProperty>(
        ownerPropertyQueryKey(propertyId),
        (property) =>
          property
            ? {
                ...property,
                activeVersion: { ...property.activeVersion, photos },
              }
            : property,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerPropertyQueryKey(propertyId),
        }),
        queryClient.invalidateQueries({
          queryKey: OWNER_PROPERTIES_QUERY_KEY,
        }),
      ]);
    },
    retry: false,
  });
}

export function useReorderPropertyPhotos(propertyId: string) {
  return usePhotoMutation<readonly string[]>(propertyId, (photoIds) =>
    propertiesService.reorderPropertyPhotos(propertyId, photoIds),
  );
}

export function useSetPropertyPhotoCover(propertyId: string) {
  return usePhotoMutation<string>(propertyId, (photoId) =>
    propertiesService.setPropertyPhotoCover(propertyId, photoId),
  );
}

export function useUpdatePropertyPhotoAltText(propertyId: string) {
  return usePhotoMutation<{ photoId: string; altText: string | null }>(
    propertyId,
    ({ photoId, altText }: { photoId: string; altText: string | null }) =>
      propertiesService.updatePropertyPhotoAltText(
        propertyId,
        photoId,
        altText,
      ),
  );
}

export function useRemovePropertyPhoto(propertyId: string) {
  return usePhotoMutation<string>(propertyId, (photoId) =>
    propertiesService.removePropertyPhoto(propertyId, photoId),
  );
}
