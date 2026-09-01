import { useEffect, useRef, useState } from "react";
import type { PublicPlaceListItem } from "../../places/types/place.types";
import {
  loadGoogleMapsLibraries,
  SRI_LANKA_MAP_CENTER,
  SRI_LANKA_MAP_ZOOM,
  type GoogleMapsLibraries,
} from "../../../services/google-maps";
import { isValidCoordinatePair } from "../map-coordinates";
import {
  createMapMarker,
  removeMapMarker,
  type ComfortGoMapMarker,
} from "../map-markers";

interface PublicPlacesMapProps {
  places: PublicPlaceListItem[];
  selectedPropertyId: string | null;
  onSelect: (propertyId: string) => void;
}

interface MarkerRecord {
  marker: ComfortGoMapMarker;
  listener: google.maps.MapsEventListener;
  position: google.maps.LatLngLiteral;
}

export function PublicPlacesMap({
  places,
  selectedPropertyId,
  onSelect,
}: PublicPlacesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const librariesRef = useRef<GoogleMapsLibraries | null>(null);
  const markersRef = useRef<Map<string, MarkerRecord>>(new Map());
  const selectRef = useRef(onSelect);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let cancelled = false;
    const markers = markersRef.current;

    if (navigator.onLine === false) {
      void Promise.resolve().then(() => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          "The map is unavailable while offline. The verified results list is still usable.",
        );
      });
      return () => {
        cancelled = true;
      };
    }

    void loadGoogleMapsLibraries()
      .then((libraries) => {
        if (cancelled || !containerRef.current) return;
        librariesRef.current = libraries;
        mapRef.current = new libraries.maps.Map(containerRef.current, {
          center: SRI_LANKA_MAP_CENTER,
          zoom: SRI_LANKA_MAP_ZOOM,
          mapId: libraries.mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          scaleControl: true,
          clickableIcons: false,
          gestureHandling: "cooperative",
          controlSize: 34,
        });
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Google Maps could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
      for (const record of markers.values()) {
        record.listener.remove();
        removeMapMarker(record.marker);
      }
      markers.clear();
      mapRef.current = null;
      librariesRef.current = null;
    };
  }, [loadAttempt]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current || !librariesRef.current) return;

    for (const record of markersRef.current.values()) {
      record.listener.remove();
      removeMapMarker(record.marker);
    }
    markersRef.current.clear();

    const validPlaces = places.filter((place) =>
      isValidCoordinatePair(place.latitude, place.longitude),
    );
    const bounds = new librariesRef.current.core.LatLngBounds();

    for (const place of validPlaces) {
      const position = { lat: place.latitude, lng: place.longitude };
      const marker = createMapMarker(librariesRef.current, {
        map: mapRef.current,
        position,
        title: place.name,
      });
      const listener = marker.addListener("click", () =>
        selectRef.current(place.propertyId),
      );
      markersRef.current.set(place.propertyId, { marker, listener, position });
      bounds.extend(position);
    }

    if (validPlaces.length === 1) {
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(14);
    } else if (validPlaces.length > 1) {
      mapRef.current.fitBounds(bounds, 48);
    } else {
      mapRef.current.setCenter(SRI_LANKA_MAP_CENTER);
      mapRef.current.setZoom(SRI_LANKA_MAP_ZOOM);
    }
  }, [places, status]);

  useEffect(() => {
    if (!selectedPropertyId || !mapRef.current) return;
    const selected = markersRef.current.get(selectedPropertyId);
    if (!selected) return;
    mapRef.current.panTo(selected.position);
    if ((mapRef.current.getZoom() ?? 0) < 13) mapRef.current.setZoom(13);
  }, [selectedPropertyId]);

  return (
    <section
      className="relative min-h-[34rem] overflow-hidden rounded-[1.4rem] bg-slate-100 lg:min-h-[44rem]"
      aria-label="Verified places map"
    >
      <div className="absolute inset-0" ref={containerRef} />
      {status === "loading" ? (
        <div
          className="absolute inset-0 grid place-items-center bg-slate-100 p-6 text-center text-sm font-semibold text-slate-600"
          role="status"
        >
          Loading Google Maps…
        </div>
      ) : null}
      {status === "ready" ? (
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/70 bg-white/90 px-3.5 py-2 text-xs font-black text-slate-800 shadow-lg backdrop-blur">
          {places.length} verified {places.length === 1 ? "place" : "places"}
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_top,#ecfdf5,#f8fafc_55%)] p-6 text-center">
          <div className="max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
            <span
              className="mx-auto grid size-12 place-items-center rounded-full bg-amber-100 text-xl"
              aria-hidden="true"
            >
              !
            </span>
            <p className="mt-4 text-xl font-black text-slate-950" role="status">
              Map unavailable
            </p>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-600">
              {errorMessage}
            </p>
            <button
              className="mt-5 min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white"
              type="button"
              onClick={() => {
                setStatus("loading");
                setErrorMessage(null);
                setLoadAttempt((attempt) => attempt + 1);
              }}
            >
              Try loading the map again
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
