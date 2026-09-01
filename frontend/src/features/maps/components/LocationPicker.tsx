import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadGoogleMapsLibraries,
  SRI_LANKA_MAP_CENTER,
  SRI_LANKA_MAP_ZOOM,
  type GoogleMapsLibraries,
} from "../../../services/google-maps";
import {
  isValidCoordinatePair,
  markerPositionToCoordinates,
} from "../map-coordinates";
import {
  createMapMarker,
  getMapMarkerPosition,
  removeMapMarker,
  setMapMarkerDraggable,
  setMapMarkerPosition,
  type ComfortGoMapMarker,
} from "../map-markers";

interface LocationPickerProps {
  latitude: number | null;
  longitude: number | null;
  disabled: boolean;
  onChange: (latitude: number, longitude: number) => void;
}

export function LocationPicker({
  latitude,
  longitude,
  disabled,
  onChange,
}: LocationPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const librariesRef = useRef<GoogleMapsLibraries | null>(null);
  const markerRef = useRef<ComfortGoMapMarker | null>(null);
  const markerListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const changeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const initialCoordinatesRef = useRef({ latitude, longitude });
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);
  useEffect(() => {
    disabledRef.current = disabled;
    if (markerRef.current) {
      setMapMarkerDraggable(markerRef.current, !disabled);
    }
  }, [disabled]);

  const placeMarker = useCallback(
    (position: google.maps.LatLngLiteral): void => {
      const map = mapRef.current;
      const libraries = librariesRef.current;
      if (!map || !libraries) return;

      if (!markerRef.current) {
        markerRef.current = createMapMarker(libraries, {
          map,
          position,
          title: "Selected property location",
          draggable: !disabledRef.current,
        });
        markerListenerRef.current = markerRef.current.addListener(
          "dragend",
          () => {
            if (disabledRef.current || !markerRef.current) return;
            const coordinates = markerPositionToCoordinates(
              getMapMarkerPosition(markerRef.current),
            );
            if (coordinates) {
              changeRef.current(coordinates.latitude, coordinates.longitude);
            }
          },
        );
      } else {
        setMapMarkerPosition(markerRef.current, position);
      }
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    let mapClickListener: google.maps.MapsEventListener | null = null;

    void loadGoogleMapsLibraries()
      .then((libraries) => {
        if (cancelled || !containerRef.current) return;
        librariesRef.current = libraries;
        const initialCoordinates = initialCoordinatesRef.current;
        const hasSavedPosition =
          initialCoordinates.latitude !== null &&
          initialCoordinates.longitude !== null &&
          isValidCoordinatePair(
            initialCoordinates.latitude,
            initialCoordinates.longitude,
          );
        const center = hasSavedPosition
          ? {
              lat: initialCoordinates.latitude!,
              lng: initialCoordinates.longitude!,
            }
          : SRI_LANKA_MAP_CENTER;
        mapRef.current = new libraries.maps.Map(containerRef.current, {
          center,
          zoom: hasSavedPosition ? 15 : SRI_LANKA_MAP_ZOOM,
          mapId: libraries.mapId,
          mapTypeControl: false,
          streetViewControl: false,
        });
        if (hasSavedPosition) placeMarker(center);
        mapClickListener = mapRef.current.addListener(
          "click",
          (event: google.maps.MapMouseEvent) => {
            if (disabledRef.current || !event.latLng) return;
            const position = event.latLng.toJSON();
            placeMarker(position);
            changeRef.current(position.lat, position.lng);
          },
        );
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "The map location picker could not be loaded.",
        );
      });

    return () => {
      cancelled = true;
      mapClickListener?.remove();
      markerListenerRef.current?.remove();
      if (markerRef.current) removeMapMarker(markerRef.current);
      markerRef.current = null;
      mapRef.current = null;
      librariesRef.current = null;
    };
  }, [placeMarker]);

  useEffect(() => {
    if (
      status !== "ready" ||
      latitude === null ||
      longitude === null ||
      !isValidCoordinatePair(latitude, longitude)
    ) {
      return;
    }
    const position = { lat: latitude, lng: longitude };
    placeMarker(position);
    mapRef.current?.panTo(position);
  }, [latitude, longitude, placeMarker, status]);

  return (
    <section className="sm:col-span-2" aria-labelledby="location-picker-title">
      <h3 className="font-black text-slate-950" id="location-picker-title">
        Pin the exact location
      </h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">
        Click the map or drag its marker. This updates coordinates only; enter
        the address, district, and city manually. The coordinate fields remain
        the keyboard-accessible alternative.
      </p>
      <div className="relative mt-3 min-h-80 overflow-hidden rounded-2xl border border-slate-300 bg-slate-100">
        <div className="absolute inset-0" ref={containerRef} />
        {status === "loading" ? (
          <div
            className="absolute inset-0 grid place-items-center p-6 text-sm font-semibold text-slate-600"
            role="status"
          >
            Loading location map…
          </div>
        ) : null}
        {status === "error" ? (
          <div className="absolute inset-0 grid place-items-center bg-amber-50 p-6 text-center">
            <div>
              <p className="font-black text-amber-950">
                Map picker unavailable
              </p>
              <p
                className="mt-2 max-w-md text-sm leading-6 text-amber-900"
                role="status"
              >
                {errorMessage} Enter latitude and longitude manually below.
              </p>
            </div>
          </div>
        ) : null}
      </div>
      {disabled ? (
        <p className="mt-2 text-sm font-semibold text-slate-600">
          This submitted location is read-only.
        </p>
      ) : null}
    </section>
  );
}
