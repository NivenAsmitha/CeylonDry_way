import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

export const SRI_LANKA_MAP_CENTER = { lat: 7.8731, lng: 80.7718 } as const;
export const SRI_LANKA_MAP_ZOOM = 7;

export interface GoogleMapsLibraries {
  core: google.maps.CoreLibrary;
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  mapId?: string;
}

export class GoogleMapsConfigurationError extends Error {
  constructor() {
    super("Google Maps is not configured. The manual location tools remain available.");
    this.name = "GoogleMapsConfigurationError";
  }
}

export class GoogleMapsLoadError extends Error {
  constructor() {
    super("Google Maps could not be loaded. Check your connection and try again.");
    this.name = "GoogleMapsLoadError";
  }
}

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const configuredMapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || undefined;
let optionsInitialized = false;
let librariesPromise: Promise<GoogleMapsLibraries> | null = null;

function applicationMapLanguage(): string {
  const requested = document.documentElement.lang.toLowerCase().split("-")[0];
  return ["en", "si", "ta"].includes(requested) ? requested : "en";
}

export function getGoogleMapsConfiguration(): {
  configured: boolean;
  mapId?: string;
} {
  return { configured: Boolean(apiKey), mapId: configuredMapId };
}

export function loadGoogleMapsLibraries(): Promise<GoogleMapsLibraries> {
  if (!apiKey) return Promise.reject(new GoogleMapsConfigurationError());
  if (librariesPromise) return librariesPromise;

  if (!optionsInitialized) {
    setOptions({
      key: apiKey,
      v: "weekly",
      language: applicationMapLanguage(),
      region: "LK",
      authReferrerPolicy: "origin",
      ...(configuredMapId ? { mapIds: [configuredMapId] } : {}),
    });
    optionsInitialized = true;
  }

  const operation = Promise.all([
    importLibrary("core"),
    importLibrary("maps"),
    importLibrary("marker"),
  ]).then(([core, maps, marker]) => ({
    core,
    maps,
    marker,
    mapId: configuredMapId,
  }));

  librariesPromise = operation.catch(() => {
    librariesPromise = null;
    throw new GoogleMapsLoadError();
  });
  return librariesPromise;
}
