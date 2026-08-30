import type { GoogleMapsLibraries } from "../../services/google-maps";

export type CeylonMapMarker =
  | google.maps.Marker
  | google.maps.marker.AdvancedMarkerElement;

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
  if (libraries.mapId) {
    return new libraries.marker.AdvancedMarkerElement({
      map: options.map,
      position: options.position,
      title: options.title,
      gmpClickable: true,
      gmpDraggable: options.draggable ?? false,
    });
  }

  return new libraries.marker.Marker({
    map: options.map,
    position: options.position,
    title: options.title,
    clickable: true,
    draggable: options.draggable ?? false,
  });
}

export function removeMapMarker(marker: CeylonMapMarker): void {
  if ("setMap" in marker) marker.setMap(null);
  else marker.map = null;
}

export function setMapMarkerPosition(
  marker: CeylonMapMarker,
  position: google.maps.LatLngLiteral,
): void {
  if ("setPosition" in marker) marker.setPosition(position);
  else marker.position = position;
}

export function setMapMarkerDraggable(
  marker: CeylonMapMarker,
  draggable: boolean,
): void {
  if ("setDraggable" in marker) marker.setDraggable(draggable);
  else marker.gmpDraggable = draggable;
}

export function getMapMarkerPosition(
  marker: CeylonMapMarker,
): google.maps.LatLng | google.maps.LatLngLiteral | google.maps.LatLngAltitudeLiteral | null | undefined {
  return "getPosition" in marker ? marker.getPosition() : marker.position;
}
