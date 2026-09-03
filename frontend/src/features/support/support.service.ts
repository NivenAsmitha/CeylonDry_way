import { z } from "zod";
import { apiClient } from "../../services/api";

export const SUPPORT_CATEGORIES = [
  "ACCOUNT_LOGIN",
  "PROPERTY_LISTING",
  "REVIEW_RATING",
  "INCORRECT_FACILITY",
  "PHOTO_UPLOAD",
  "ACCESSIBILITY",
  "SAFETY",
  "TECHNICAL",
  "OTHER",
] as const;
export const SUPPORT_STATUSES = [
  "OPEN",
  "ASSIGNED",
  "WAITING_FOR_CLIENT",
  "WAITING_FOR_STAFF",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export const SUPPORT_PRIORITIES = ["NORMAL", "URGENT"] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportStatus = (typeof SUPPORT_STATUSES)[number];
export type SupportPriority = (typeof SUPPORT_PRIORITIES)[number];

export const supportCategoryLabels: Record<SupportCategory, string> = {
  ACCOUNT_LOGIN: "Account or login problem",
  PROPERTY_LISTING: "Property listing problem",
  REVIEW_RATING: "Review or rating problem",
  INCORRECT_FACILITY: "Incorrect facility information",
  PHOTO_UPLOAD: "Photo-upload problem",
  ACCESSIBILITY: "Accessibility concern",
  SAFETY: "Safety concern",
  TECHNICAL: "Technical problem",
  OTHER: "Other",
};

const personSchema = z.object({ id: z.uuid(), name: z.string() });
const ticketBaseSchema = z.object({
  id: z.uuid(),
  ticketNumber: z.number().int().positive(),
  category: z.enum(SUPPORT_CATEGORIES),
  priority: z.enum(SUPPORT_PRIORITIES),
  status: z.enum(SUPPORT_STATUSES),
  subject: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  createdBy: personSchema.extend({ email: z.email() }),
  assignedReviewer: personSchema.nullable(),
  relatedProperty: z
    .object({
      id: z.uuid(),
      activeVersion: z.object({ name: z.string().nullable() }).nullable(),
    })
    .nullable(),
  _count: z.object({ messages: z.number().int().nonnegative() }),
});

const supportTicketSchema = ticketBaseSchema.extend({
  messages: z.array(
    z.object({
      id: z.uuid(),
      message: z.string(),
      createdAt: z.iso.datetime(),
      author: personSchema.extend({
        roles: z.array(
          z.object({ role: z.object({ name: z.string() }) }),
        ),
      }),
    }),
  ),
});

const supportTicketListSchema = z.object({
  items: z.array(ticketBaseSchema),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type SupportTicket = z.infer<typeof supportTicketSchema>;
export type SupportTicketList = z.infer<typeof supportTicketListSchema>;

export interface CreateSupportTicketInput {
  category: SupportCategory;
  priority: SupportPriority;
  subject: string;
  message: string;
  relatedPropertyId?: string;
}

export interface SupportTicketQuery {
  search?: string;
  status?: SupportStatus;
  category?: SupportCategory;
  priority?: SupportPriority;
  page?: number;
}

export async function createSupportTicket(input: CreateSupportTicketInput) {
  const response = await apiClient.post<unknown>("/support/tickets", input);
  return supportTicketSchema.parse(response.data);
}

export async function listMySupportTickets(
  query: SupportTicketQuery,
  signal?: AbortSignal,
): Promise<SupportTicketList> {
  const response = await apiClient.get<unknown>("/support/tickets", {
    params: query,
    signal,
  });
  return supportTicketListSchema.parse(response.data);
}

export async function getMySupportTicket(
  ticketId: string,
  signal?: AbortSignal,
): Promise<SupportTicket> {
  const response = await apiClient.get<unknown>(`/support/tickets/${ticketId}`, {
    signal,
  });
  return supportTicketSchema.parse(response.data);
}

export async function addMySupportMessage(
  ticketId: string,
  message: string,
): Promise<void> {
  await apiClient.post(`/support/tickets/${ticketId}/messages`, { message });
}

export async function closeMySupportTicket(ticketId: string): Promise<void> {
  await apiClient.patch(`/support/tickets/${ticketId}/close`);
}

export async function listStaffSupportTickets(
  query: SupportTicketQuery,
  signal?: AbortSignal,
): Promise<SupportTicketList> {
  const response = await apiClient.get<unknown>("/staff/support/tickets", {
    params: query,
    signal,
  });
  return supportTicketListSchema.parse(response.data);
}

export async function getStaffSupportTicket(
  ticketId: string,
  signal?: AbortSignal,
): Promise<SupportTicket> {
  const response = await apiClient.get<unknown>(
    `/staff/support/tickets/${ticketId}`,
    { signal },
  );
  return supportTicketSchema.parse(response.data);
}

export async function claimSupportTicket(ticketId: string): Promise<void> {
  await apiClient.patch(`/staff/support/tickets/${ticketId}/claim`);
}

export async function addStaffSupportMessage(
  ticketId: string,
  message: string,
): Promise<void> {
  await apiClient.post(`/staff/support/tickets/${ticketId}/messages`, {
    message,
  });
}

export async function updateSupportTicketStatus(
  ticketId: string,
  status: SupportStatus,
  reason: string,
): Promise<void> {
  await apiClient.patch(`/staff/support/tickets/${ticketId}/status`, {
    status,
    reason,
  });
}
