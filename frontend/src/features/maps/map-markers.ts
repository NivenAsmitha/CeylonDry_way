import type { GoogleMapsLibraries } from "../../services/google-maps";

export type CeylonMapMarker = google.maps.Marker;

interface CreateMarkerOptions {
  map: google.maps.Map;
  position: google.maps.LatLngLiteral;
  title: string;
  draggable?: boolean;
}

export function createMapMarker(
  libraries: GoogleMapsLibraries,
  options: CreateMarkerOptions,
): CeylonMapMarker {
  return new libraries.marker.Marker({
    map: options.map,
    position: options.position,
    title: options.title,
    clickable: true,
    draggable: options.draggable ?? false,
  });
}

export function removeMapMarker(marker: CeylonMapMarker): void {
  marker.setMap(null);
}

export function setMapMarkerPosition(
  marker: CeylonMapMarker,
  position: google.maps.LatLngLiteral,
): void {
  marker.setPosition(position);
}

export function setMapMarkerDraggable(
  marker: CeylonMapMarker,
  draggable: boolean,
): void {
  marker.setDraggable(draggable);
}

export function getMapMarkerPosition(
  marker: CeylonMapMarker,
): google.maps.LatLng | google.maps.LatLngLiteral | null | undefined {
  return marker.getPosition();
}
