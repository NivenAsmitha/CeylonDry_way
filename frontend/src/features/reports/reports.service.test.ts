import { afterEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "../../services/api";
import {
  createPropertyReport,
  moderatePropertyReport,
} from "./reports.service";

const PROPERTY_ID = "11111111-1111-4111-8111-111111111111";
const REPORT_ID = "22222222-2222-4222-8222-222222222222";

describe("property reports service", () => {
  afterEach(() => vi.restoreAllMocks());

  it("submits a public report to the selected place", async () => {
    const createdAt = "2026-09-01T00:00:00.000Z";
    const request = vi.spyOn(apiClient, "post").mockResolvedValue({
      data: {
        id: REPORT_ID,
        status: "OPEN",
        createdAt,
        message: "Report received",
      },
    });

    await expect(
      createPropertyReport(PROPERTY_ID, {
        category: "INCORRECT_DETAILS",
        description: "The displayed opening hours are not correct.",
        reporterEmail: "person@example.test",
      }),
    ).resolves.toMatchObject({ id: REPORT_ID, status: "OPEN", createdAt });
    expect(request).toHaveBeenCalledWith(`/places/${PROPERTY_ID}/reports`, {
      category: "INCORRECT_DETAILS",
      description: "The displayed opening hours are not correct.",
      reporterEmail: "person@example.test",
    });
  });

  it("uses the admin-only moderation endpoint", async () => {
    const request = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: null });

    await moderatePropertyReport(
      REPORT_ID,
      "RESOLVE",
      "The owner corrected the opening hours.",
    );

    expect(request).toHaveBeenCalledWith(
      `/admin/reports/${REPORT_ID}/moderation`,
      {
        action: "RESOLVE",
        note: "The owner corrected the opening hours.",
      },
    );
  });
});
