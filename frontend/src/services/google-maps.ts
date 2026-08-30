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
    super(
      "Google Maps is not configured. The manual location tools remain available.",
    );
    this.name = "GoogleMapsConfigurationError";
  }
}

export class GoogleMapsLoadError extends Error {
  constructor() {
    super(
      "Google Maps could not be loaded. Check your connection and try again.",
    );
    this.name = "GoogleMapsLoadError";
  }
}

export class GoogleMapsAuthenticationError extends Error {
  constructor() {
    super(
      "Google Maps authentication failed. Check the key's website restrictions, Maps JavaScript API access, and billing, then reload the page.",
    );
    this.name = "GoogleMapsAuthenticationError";
  }
}

const GOOGLE_MAPS_API_KEY_PLACEHOLDER =
  "AIzaSyDlW0e3ABeg54HrCPRUbu74_zizQH0yTTA";
const configuredApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const apiKey =
  configuredApiKey === GOOGLE_MAPS_API_KEY_PLACEHOLDER ? "" : configuredApiKey;
const configuredMapId =
  import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || undefined;
let optionsInitialized = false;
let librariesPromise: Promise<GoogleMapsLibraries> | null = null;
let authenticationError: GoogleMapsAuthenticationError | null = null;
let rejectAuthentication:
  | ((reason: GoogleMapsAuthenticationError) => void)
  | null = null;
let authenticationHandlerInstalled = false;

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

function installAuthenticationFailureHandler(): void {
  if (authenticationHandlerInstalled) return;

  window.gm_authFailure = () => {
    authenticationError = new GoogleMapsAuthenticationError();
    rejectAuthentication?.(authenticationError);
  };
  authenticationHandlerInstalled = true;
}

export function loadGoogleMapsLibraries(): Promise<GoogleMapsLibraries> {
  if (!apiKey) return Promise.reject(new GoogleMapsConfigurationError());
  if (authenticationError) return Promise.reject(authenticationError);
  if (librariesPromise) return librariesPromise;

  installAuthenticationFailureHandler();

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

  const authenticationFailure = new Promise<never>((_resolve, reject) => {
    rejectAuthentication = reject;
  });
  const libraryLoad = Promise.all([
    importLibrary("core"),
    importLibrary("maps"),
    importLibrary("marker"),
  ]).then(([core, maps, marker]) => ({
    core,
    maps,
    marker,
    mapId: configuredMapId,
  }));
  const operation = Promise.race([libraryLoad, authenticationFailure]).finally(
    () => {
      rejectAuthentication = null;
    },
  );

  librariesPromise = operation.catch((error: unknown) => {
    librariesPromise = null;
    if (error instanceof GoogleMapsAuthenticationError) throw error;
    throw new GoogleMapsLoadError();
  });
  return librariesPromise;
}
