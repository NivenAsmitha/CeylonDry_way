import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../services/api";
import {
  addStaffSupportMessage,
  createSupportTicket,
  updateSupportTicketStatus,
} from "./support.service";

const TICKET_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";
const NOW = "2026-09-03T00:00:00.000Z";

describe("support service", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates and validates a client support request", async () => {
    const request = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: {
        id: TICKET_ID,
        ticketNumber: 7,
        category: "TECHNICAL",
        priority: "NORMAL",
        status: "OPEN",
        subject: "Map does not load",
        createdAt: NOW,
        updatedAt: NOW,
        closedAt: null,
        createdBy: { id: USER_ID, name: "Client", email: "client@test.com" },
        assignedReviewer: null,
        relatedProperty: null,
        _count: { messages: 1 },
        messages: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            message: "The map does not load on my phone.",
            createdAt: NOW,
            author: { id: USER_ID, name: "Client", roles: [] },
          },
        ],
      },
    });
    const input = {
      category: "TECHNICAL" as const,
      priority: "NORMAL" as const,
      subject: "Map does not load",
      message: "The map does not load on my phone.",
    };

    await expect(createSupportTicket(input)).resolves.toMatchObject({
      id: TICKET_ID,
      ticketNumber: 7,
      status: "OPEN",
    });
    expect(request).toHaveBeenCalledWith("/support/tickets", input);
  });

  it("uses protected staff endpoints for replies and status decisions", async () => {
    const post = vi.spyOn(apiClient, "post").mockResolvedValue({ data: null });
    const patch = vi.spyOn(apiClient, "patch").mockResolvedValue({ data: null });

    await addStaffSupportMessage(TICKET_ID, "We are investigating this issue.");
    await updateSupportTicketStatus(
      TICKET_ID,
      "RESOLVED",
      "The configuration was corrected and verified.",
    );

    expect(post).toHaveBeenCalledWith(
      `/staff/support/tickets/${TICKET_ID}/messages`,
      { message: "We are investigating this issue." },
    );
    expect(patch).toHaveBeenCalledWith(
      `/staff/support/tickets/${TICKET_ID}/status`,
      {
        status: "RESOLVED",
        reason: "The configuration was corrected and verified.",
      },
    );
  });
});
