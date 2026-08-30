import { useEffect, useRef, useState } from "react";
import { loadGoogleMapsLibraries } from "../../../services/google-maps";
import { isValidCoordinatePair } from "../map-coordinates";
import { createMapMarker, removeMapMarker } from "../map-markers";

interface LocationPreviewMapProps {
  latitude: number;
  longitude: number;
  title: string;
}

export function LocationPreviewMap({
  latitude,
  longitude,
  title,
}: LocationPreviewMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState(false);
  const validCoordinates = isValidCoordinatePair(latitude, longitude);

  useEffect(() => {
    let cancelled = false;
    let marker: ReturnType<typeof createMapMarker> | null = null;
    if (!validCoordinates) return;
    void loadGoogleMapsLibraries()
      .then((libraries) => {
        if (cancelled || !containerRef.current) return;
        const position = { lat: latitude, lng: longitude };
        const map = new libraries.maps.Map(containerRef.current, {
          center: position,
          zoom: 15,
          mapId: libraries.mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        marker = createMapMarker(libraries, { map, position, title });
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
      if (marker) removeMapMarker(marker);
    };
  }, [latitude, longitude, title, validCoordinates]);

  if (!validCoordinates || loadError) {
    return (
      <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900" role="status">
        Map preview unavailable. Exact coordinates and Directions remain available.
      </p>
    );
  }

  return (
    <div
      className="min-h-64 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
      ref={containerRef}
      aria-label={`Map location for ${title}`}
    />
  );
}
