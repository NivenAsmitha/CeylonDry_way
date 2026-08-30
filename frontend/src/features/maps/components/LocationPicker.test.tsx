import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocationPicker } from "./LocationPicker";

const mapsLoader = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("../../../services/google-maps", () => ({
  loadGoogleMapsLibraries: mapsLoader.load,
  SRI_LANKA_MAP_CENTER: { lat: 7.8731, lng: 80.7718 },
  SRI_LANKA_MAP_ZOOM: 7,
}));

const mapInstances: FakeMap[] = [];
const markerInstances: FakeMarker[] = [];

class FakeMap {
  click: ((event: google.maps.MapMouseEvent) => void) | null = null;
  panTo = vi.fn();
  addListener(_name: string, handler: (event: google.maps.MapMouseEvent) => void) {
    this.click = handler;
    return { remove: vi.fn() };
  }
  constructor() {
    mapInstances.push(this);
  }
}

class FakeMarker {
  position: google.maps.LatLngLiteral;
  dragEnd: (() => void) | null = null;
  setMap = vi.fn();
  constructor(options: google.maps.MarkerOptions) {
    this.position = options.position as google.maps.LatLngLiteral;
    markerInstances.push(this);
  }
  addListener(_name: string, handler: () => void) {
    this.dragEnd = handler;
    return { remove: vi.fn() };
  }
  setPosition(position: google.maps.LatLngLiteral) {
    this.position = position;
  }
  getPosition() {
    return this.position;
  }
}

describe("LocationPicker", () => {
  beforeEach(() => {
    mapInstances.length = 0;
    markerInstances.length = 0;
    mapsLoader.load.mockResolvedValue({
      core: {},
      maps: { Map: FakeMap },
      marker: { Marker: FakeMarker },
      mapId: undefined,
    });
  });

  it("initializes from saved coordinates and reports map clicks", async () => {
    const onChange = vi.fn();
    render(
      <LocationPicker
        latitude={6.9271}
        longitude={79.8612}
        disabled={false}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(markerInstances).toHaveLength(1));
    expect(markerInstances[0].position).toEqual({ lat: 6.9271, lng: 79.8612 });

    mapInstances[0].click?.({
      latLng: { toJSON: () => ({ lat: 7.1, lng: 80.2 }) },
    } as google.maps.MapMouseEvent);
    expect(onChange).toHaveBeenCalledWith(7.1, 80.2);
  });

  it("reports a draggable marker's final coordinates", async () => {
    const onChange = vi.fn();
    render(
      <LocationPicker
        latitude={7}
        longitude={80}
        disabled={false}
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(markerInstances).toHaveLength(1));
    markerInstances[0].position = { lat: 7.25, lng: 80.5 };
    markerInstances[0].dragEnd?.();
    expect(onChange).toHaveBeenCalledWith(7.25, 80.5);
  });

  it("prevents map changes in read-only status", async () => {
    const onChange = vi.fn();
    render(
      <LocationPicker
        latitude={7}
        longitude={80}
        disabled
        onChange={onChange}
      />,
    );
    await waitFor(() => expect(mapInstances).toHaveLength(1));
    mapInstances[0].click?.({
      latLng: { toJSON: () => ({ lat: 8, lng: 81 }) },
    } as google.maps.MapMouseEvent);
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText(/submitted location is read-only/i)).toBeTruthy();
  });

  it("keeps manual-coordinate guidance visible when Maps fails", async () => {
    mapsLoader.load.mockRejectedValueOnce(new Error("Missing browser key"));
    render(
      <LocationPicker
        latitude={null}
        longitude={null}
        disabled={false}
        onChange={vi.fn()}
      />,
    );
    expect(await screen.findByText(/enter latitude and longitude manually/i)).toBeTruthy();
  });
});
