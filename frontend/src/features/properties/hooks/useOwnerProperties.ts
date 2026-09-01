import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/hooks/useAuth";
import { PRIVATE_QUERY_KEY } from "../../../services/queryClient";
import * as propertiesService from "../services/properties.service";
import type { PropertyWorkflow } from "../services/properties.service";
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

export function ownerPropertyQueryKey(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  return [...OWNER_PROPERTIES_QUERY_KEY, workflow, propertyId] as const;
}

export function usePropertyAmenities() {
  return useQuery({
    queryKey: PROPERTY_AMENITIES_QUERY_KEY,
    queryFn: ({ signal }) => propertiesService.listAmenities(signal),
    staleTime: 5 * 60_000,
  });
}

export function useOwnerProperties(workflow: PropertyWorkflow = "owner") {
  return useQuery({
    queryKey: [...OWNER_PROPERTIES_QUERY_KEY, workflow],
    queryFn: ({ signal }) =>
      propertiesService.listOwnerProperties(signal, workflow),
  });
}

export function useOwnerProperty(
  propertyId: string | undefined,
  workflow: PropertyWorkflow = "owner",
) {
  return useQuery({
    queryKey: ownerPropertyQueryKey(propertyId ?? "missing", workflow),
    queryFn: ({ signal }) =>
      propertiesService.getOwnerProperty(propertyId ?? "", signal, workflow),
    enabled: Boolean(propertyId),
  });
}

export function useCreatePropertyDraft(
  workflow: PropertyWorkflow = "owner",
) {
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();

  return useMutation({
    mutationFn: (input: PropertyDraftInput) =>
      propertiesService.createPropertyDraft(input, workflow),
    onSuccess: async (property) => {
      queryClient.setQueryData(
        ownerPropertyQueryKey(property.id, workflow),
        property,
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: OWNER_PROPERTIES_QUERY_KEY }),
        refetchUser(),
      ]);
    },
  });
}

export function useUpdatePropertyDraft(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PropertyDraftInput) =>
      propertiesService.updatePropertyDraft(propertyId, input, workflow),
    onSuccess: async (property) => {
      queryClient.setQueryData(
        ownerPropertyQueryKey(property.id, workflow),
        property,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerPropertyQueryKey(propertyId, workflow),
        }),
        queryClient.invalidateQueries({
          queryKey: OWNER_PROPERTIES_QUERY_KEY,
        }),
      ]);
    },
  });
}

export function useSubmitPropertyDraft(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      propertiesService.submitPropertyDraft(propertyId, workflow),
    onSuccess: async (property) => {
      queryClient.setQueryData(
        ownerPropertyQueryKey(property.id, workflow),
        property,
      );
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ownerPropertyQueryKey(propertyId, workflow),
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
  workflow: PropertyWorkflow,
  mutationFn: (input: TInput) => Promise<PropertyPhoto[]>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async (photos) => {
      queryClient.setQueryData<OwnerProperty>(
        ownerPropertyQueryKey(propertyId, workflow),
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
          queryKey: ownerPropertyQueryKey(propertyId, workflow),
        }),
        queryClient.invalidateQueries({
          queryKey: OWNER_PROPERTIES_QUERY_KEY,
        }),
      ]);
    },
  });
}

export function useUploadPropertyPhotos(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      files,
      onProgress,
    }: {
      files: readonly File[];
      onProgress?: (percentage: number) => void;
    }) =>
      propertiesService.uploadPropertyPhotos(
        propertyId,
        files,
        onProgress,
        workflow,
      ),
    onSuccess: async (photos) => {
      queryClient.setQueryData<OwnerProperty>(
        ownerPropertyQueryKey(propertyId, workflow),
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
          queryKey: ownerPropertyQueryKey(propertyId, workflow),
        }),
        queryClient.invalidateQueries({
          queryKey: OWNER_PROPERTIES_QUERY_KEY,
        }),
      ]);
    },
    retry: false,
  });
}

export function useReorderPropertyPhotos(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  return usePhotoMutation<readonly string[]>(propertyId, workflow, (photoIds) =>
    propertiesService.reorderPropertyPhotos(propertyId, photoIds, workflow),
  );
}

export function useSetPropertyPhotoCover(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  return usePhotoMutation<string>(propertyId, workflow, (photoId) =>
    propertiesService.setPropertyPhotoCover(propertyId, photoId, workflow),
  );
}

export function useUpdatePropertyPhotoAltText(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  return usePhotoMutation<{ photoId: string; altText: string | null }>(
    propertyId,
    workflow,
    ({ photoId, altText }: { photoId: string; altText: string | null }) =>
      propertiesService.updatePropertyPhotoAltText(
        propertyId,
        photoId,
        altText,
        workflow,
      ),
  );
}

export function useRemovePropertyPhoto(
  propertyId: string,
  workflow: PropertyWorkflow = "owner",
) {
  return usePhotoMutation<string>(propertyId, workflow, (photoId) =>
    propertiesService.removePropertyPhoto(propertyId, photoId, workflow),
  );
}

export function useDeleteOwnedProperty() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (propertyId: string) =>
      propertiesService.deleteOwnedProperty(propertyId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: OWNER_PROPERTIES_QUERY_KEY }),
  });
}
