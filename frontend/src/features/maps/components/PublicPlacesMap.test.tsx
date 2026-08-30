import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PublicPlaceListItem } from "../../places/types/place.types";
import { PublicPlacesMap } from "./PublicPlacesMap";

const mapsLoader = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("../../../services/google-maps", () => ({
  loadGoogleMapsLibraries: mapsLoader.load,
  SRI_LANKA_MAP_CENTER: { lat: 7.8731, lng: 80.7718 },
  SRI_LANKA_MAP_ZOOM: 7,
}));

const mapInstances: FakeMap[] = [];
const markerInstances: FakeMarker[] = [];

class FakeBounds {
  positions: google.maps.LatLngLiteral[] = [];
  extend(position: google.maps.LatLngLiteral) {
    this.positions.push(position);
    return this;
  }
  getCenter() {
    return this.positions[0] ?? { lat: 7.8731, lng: 80.7718 };
  }
}

class FakeMap {
  setCenter = vi.fn();
  setZoom = vi.fn();
  fitBounds = vi.fn();
  panTo = vi.fn();
  getZoom = vi.fn(() => 7);
  constructor() {
    mapInstances.push(this);
  }
}

class FakeMarker {
  position: google.maps.LatLngLiteral;
  setMap = vi.fn();
  click: (() => void) | null = null;
  constructor(options: google.maps.MarkerOptions) {
    this.position = options.position as google.maps.LatLngLiteral;
    markerInstances.push(this);
  }
  addListener(_name: string, handler: () => void) {
    this.click = handler;
    return { remove: vi.fn() };
  }
}

function place(overrides: Partial<PublicPlaceListItem> = {}): PublicPlaceListItem {
  return {
    propertyId: "11111111-1111-4111-8111-111111111111",
    name: "Verified Place",
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
    ...overrides,
  };
}

describe("PublicPlacesMap", () => {
  beforeEach(() => {
    mapInstances.length = 0;
    markerInstances.length = 0;
    Object.defineProperty(navigator, "onLine", {
      configurable: true,
      value: true,
    });
    mapsLoader.load.mockResolvedValue({
      core: { LatLngBounds: FakeBounds },
      maps: { Map: FakeMap },
      marker: { Marker: FakeMarker },
      mapId: undefined,
    });
  });

  it("creates markers only for valid coordinates and reports marker selection", async () => {
    const onSelect = vi.fn();
    render(
      <PublicPlacesMap
        places={[
          place(),
          place({
            propertyId: "22222222-2222-4222-8222-222222222222",
            latitude: Number.NaN,
          }),
        ]}
        selectedPropertyId={null}
        onSelect={onSelect}
      />,
    );

    await waitFor(() => expect(markerInstances).toHaveLength(1));
    markerInstances[0].click?.();
    expect(onSelect).toHaveBeenCalledWith(
      "11111111-1111-4111-8111-111111111111",
    );
  });

  it("still renders an empty map centered on Sri Lanka", async () => {
    render(
      <PublicPlacesMap
        places={[]}
        selectedPropertyId={null}
        onSelect={vi.fn()}
      />,
    );

    await waitFor(() => expect(mapInstances).toHaveLength(1));
    await waitFor(() =>
      expect(mapInstances[0].setCenter).toHaveBeenCalledWith({
        lat: 7.8731,
        lng: 80.7718,
      }),
    );
    expect(mapInstances[0].setZoom).toHaveBeenCalledWith(7);
    expect(markerInstances).toHaveLength(0);
  });

  it("pans to a result selected from the accessible list", async () => {
    const { rerender } = render(
      <PublicPlacesMap
        places={[place()]}
        selectedPropertyId={null}
        onSelect={vi.fn()}
      />,
    );
    await waitFor(() => expect(markerInstances).toHaveLength(1));

    rerender(
      <PublicPlacesMap
        places={[place()]}
        selectedPropertyId="11111111-1111-4111-8111-111111111111"
        onSelect={vi.fn()}
      />,
    );
    expect(mapInstances[0].panTo).toHaveBeenCalledWith({
      lat: 6.9271,
      lng: 79.8612,
    });
  });

  it("renders a controlled fallback when the Maps loader fails", async () => {
    mapsLoader.load.mockRejectedValueOnce(new Error("Map service unavailable"));
    render(
      <PublicPlacesMap
        places={[place()]}
        selectedPropertyId={null}
        onSelect={vi.fn()}
      />,
    );

    expect(await screen.findByText("Map unavailable")).toBeTruthy();
    expect(screen.getByText("Map service unavailable")).toBeTruthy();
  });
});
