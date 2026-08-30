export interface CoordinatePair {
  latitude: number;
  longitude: number;
}

export function isValidCoordinatePair(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function toLatLngLiteral({
  latitude,
  longitude,
}: CoordinatePair): google.maps.LatLngLiteral {
  return { lat: latitude, lng: longitude };
}

export function markerPositionToCoordinates(
  position: google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitudeLiteral | null | undefined,
): CoordinatePair | null {
  if (!position) return null;
  const latitude = typeof position.lat === "function" ? position.lat() : position.lat;
  const longitude = typeof position.lng === "function" ? position.lng() : position.lng;
  return isValidCoordinatePair(latitude, longitude)
    ? { latitude, longitude }
    : null;
}
