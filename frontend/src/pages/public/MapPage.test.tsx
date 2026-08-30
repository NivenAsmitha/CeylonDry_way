import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPlaceListResponse } from "../../features/places/types/place.types";
import { MapPage } from "./MapPage";

const placesHook = vi.hoisted(() => vi.fn());

vi.mock("../../features/places/hooks/usePlaces", () => ({
  usePublicPlaces: placesHook,
}));
vi.mock("../../features/maps/components/PublicPlacesMap", () => ({
  PublicPlacesMap: () => <div role="status">Map module test fallback</div>,
}));

const response: PublicPlaceListResponse = {
  items: [
    {
      propertyId: "11111111-1111-4111-8111-111111111111",
      name: "Approved Place",
      propertyType: "PUBLIC_FACILITY",
      shortDescription: null,
      district: "Colombo",
      city: "Colombo",
      isFree: true,
      feeLkr: null,
      wheelchairAccessible: true,
      amenities: [],
      coverImage: null,
      latitude: 6.9271,
      longitude: 79.8612,
      distanceKm: null,
      verified: true,
    },
  ],
  pagination: { page: 1, pageSize: 50, total: 1, totalPages: 1 },
  availableAmenities: [],
};

function LocationProbe() {
  return <span data-testid="location-search">{useLocation().search}</span>;
}

function renderMap(initialEntry = "/map") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/map"
          element={
            <>
              <MapPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("MapPage", () => {
  beforeEach(() => {
    placesHook.mockReturnValue({
      data: response,
      isPending: false,
      isError: false,
      isFetching: false,
    });
  });

  it("uses the bounded public places query and keeps its accessible list visible", async () => {
    renderMap("/map?district=Colombo");

    await screen.findByText("Map module test fallback");
    expect(placesHook).toHaveBeenCalledWith(
      expect.objectContaining({ district: "Colombo", page: 1, pageSize: 50 }),
    );
    expect(screen.getByText("Approved Place")).toBeTruthy();
    expect(screen.getByRole("link", { name: "View place details" })).toBeTruthy();
  });

  it("selects a result and renders a safe React details preview", async () => {
    renderMap();
    await userEvent.click(
      await screen.findByRole("button", { name: /Approved Place/i }),
    );

    expect(screen.getByText("Selected verified place")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open full details" })).toBeTruthy();
  });

  it("keeps search filter state in the URL", async () => {
    renderMap();
    await userEvent.type(
      screen.getByRole("searchbox", { name: "Search mapped places" }),
      "Galle",
    );
    await userEvent.click(screen.getByRole("button", { name: "Search map" }));

    await waitFor(() =>
      expect(screen.getByTestId("location-search").textContent).toContain(
        "search=Galle",
      ),
    );
  });

  it("renders an empty approved-results state", () => {
    placesHook.mockReturnValue({
      data: {
        ...response,
        items: [],
        pagination: { ...response.pagination, total: 0, totalPages: 0 },
      },
      isPending: false,
      isError: false,
      isFetching: false,
    });
    renderMap();
    expect(screen.getByText(/No verified places match these filters/i)).toBeTruthy();
  });
});
