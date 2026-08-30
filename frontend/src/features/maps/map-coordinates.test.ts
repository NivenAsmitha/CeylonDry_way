import { describe, expect, it } from "vitest";
import {
  isValidCoordinatePair,
  markerPositionToCoordinates,
} from "./map-coordinates";

describe("map coordinates", () => {
  it("accepts bounded finite coordinates and rejects unsafe values", () => {
    expect(isValidCoordinatePair(6.9271, 79.8612)).toBe(true);
    expect(isValidCoordinatePair(Number.NaN, 79)).toBe(false);
    expect(isValidCoordinatePair(91, 79)).toBe(false);
    expect(isValidCoordinatePair(7, -181)).toBe(false);
  });

  it("reads both LatLng-like and literal marker positions", () => {
    expect(markerPositionToCoordinates({ lat: 7, lng: 80 })).toEqual({
      latitude: 7,
      longitude: 80,
    });
    expect(
      markerPositionToCoordinates({ lat: () => 6.9, lng: () => 79.8 } as google.maps.LatLng),
    ).toEqual({ latitude: 6.9, longitude: 79.8 });
  });
});
