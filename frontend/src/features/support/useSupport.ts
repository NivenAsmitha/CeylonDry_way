import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PRIVATE_QUERY_KEY } from "../../services/queryClient";
import * as service from "./support.service";
import type {
  CreateSupportTicketInput,
  SupportStatus,
  SupportTicketQuery,
} from "./support.service";

const MY_SUPPORT_KEY = [...PRIVATE_QUERY_KEY, "my-support"] as const;
const STAFF_SUPPORT_KEY = [...PRIVATE_QUERY_KEY, "staff-support"] as const;

export function useMySupportTickets(query: SupportTicketQuery = {}) {
  return useQuery({
    queryKey: [...MY_SUPPORT_KEY, query],
    queryFn: ({ signal }) => service.listMySupportTickets(query, signal),
  });
}

export function useMySupportTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: [...MY_SUPPORT_KEY, ticketId],
    queryFn: ({ signal }) => service.getMySupportTicket(ticketId!, signal),
    enabled: Boolean(ticketId),
  });
}

export function useCreateSupportTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSupportTicketInput) =>
      service.createSupportTicket(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_SUPPORT_KEY }),
  });
}

export function useAddMySupportMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      service.addMySupportMessage(ticketId, message),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_SUPPORT_KEY }),
  });
}

export function useCloseMySupportTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => service.closeMySupportTicket(ticketId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MY_SUPPORT_KEY }),
  });
}

export function useStaffSupportTickets(query: SupportTicketQuery = {}) {
  return useQuery({
    queryKey: [...STAFF_SUPPORT_KEY, query],
    queryFn: ({ signal }) => service.listStaffSupportTickets(query, signal),
  });
}

export function useStaffSupportTicket(ticketId: string | undefined) {
  return useQuery({
    queryKey: [...STAFF_SUPPORT_KEY, ticketId],
    queryFn: ({ signal }) => service.getStaffSupportTicket(ticketId!, signal),
    enabled: Boolean(ticketId),
  });
}

function invalidateStaffSupport(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: STAFF_SUPPORT_KEY });
}

export function useClaimSupportTicket(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => service.claimSupportTicket(ticketId),
    onSuccess: () => invalidateStaffSupport(queryClient),
  });
}

export function useAddStaffSupportMessage(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (message: string) =>
      service.addStaffSupportMessage(ticketId, message),
    onSuccess: () => invalidateStaffSupport(queryClient),
  });
}

export function useUpdateSupportTicketStatus(ticketId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ status, reason }: { status: SupportStatus; reason: string }) =>
      service.updateSupportTicketStatus(ticketId, status, reason),
    onSuccess: () => invalidateStaffSupport(queryClient),
  });
}
