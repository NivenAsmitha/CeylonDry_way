import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/hooks/useAuth";
import { PRIVATE_QUERY_KEY } from "../../../services/queryClient";
import * as propertiesService from "../services/properties.service";
import type { PropertyDraftInput } from "../types/property.types";

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
      await queryClient.invalidateQueries({
        queryKey: OWNER_PROPERTIES_QUERY_KEY,
      });
    },
  });
}

export function useSubmitPropertyDraft(propertyId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => propertiesService.submitPropertyDraft(propertyId),
    onSuccess: async (property) => {
      queryClient.setQueryData(ownerPropertyQueryKey(property.id), property);
      await queryClient.invalidateQueries({
        queryKey: OWNER_PROPERTIES_QUERY_KEY,
      });
    },
  });
}
