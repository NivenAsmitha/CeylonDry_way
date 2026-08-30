import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loader = vi.hoisted(() => ({
  setOptions: vi.fn(),
  importLibrary: vi.fn(),
}));

vi.mock("@googlemaps/js-api-loader", () => loader);

describe("Google Maps loader", () => {
  beforeEach(() => {
    vi.resetModules();
    loader.setOptions.mockReset();
    loader.importLibrary.mockReset();
    document.documentElement.lang = "en-LK";
  });

  afterEach(() => vi.unstubAllEnvs());

  it("returns a controlled unconfigured state when the browser key is missing", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "");
    const maps = await import("./google-maps");

    expect(maps.getGoogleMapsConfiguration()).toEqual({
      configured: false,
      mapId: undefined,
    });
    await expect(maps.loadGoogleMapsLibraries()).rejects.toBeInstanceOf(
      maps.GoogleMapsConfigurationError,
    );
    expect(loader.setOptions).not.toHaveBeenCalled();
    expect(loader.importLibrary).not.toHaveBeenCalled();
  });

  it("initializes once and shares one concurrent library load", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "browser-key-for-test");
    vi.stubEnv("VITE_GOOGLE_MAPS_MAP_ID", "test-map-id");
    const core = { LatLngBounds: class TestBounds {} };
    const mapsLibrary = { Map: class TestMap {} };
    const marker = { Marker: class TestMarker {} };
    loader.importLibrary.mockImplementation((name: string) =>
      Promise.resolve(
        name === "core" ? core : name === "maps" ? mapsLibrary : marker,
      ),
    );
    const maps = await import("./google-maps");

    const first = maps.loadGoogleMapsLibraries();
    const second = maps.loadGoogleMapsLibraries();
    expect(second).toBe(first);
    await first;

    expect(loader.setOptions).toHaveBeenCalledTimes(1);
    expect(loader.setOptions).toHaveBeenCalledWith({
      key: "browser-key-for-test",
      v: "weekly",
      language: "en",
      region: "LK",
      authReferrerPolicy: "origin",
      mapIds: ["test-map-id"],
    });
    expect(loader.importLibrary.mock.calls.map(([name]) => name)).toEqual([
      "core",
      "maps",
      "marker",
    ]);
    await maps.loadGoogleMapsLibraries();
    expect(loader.setOptions).toHaveBeenCalledTimes(1);
    expect(loader.importLibrary).toHaveBeenCalledTimes(3);
  });

  it("converts loader rejection to a safe error without logging the key", async () => {
    vi.stubEnv("VITE_GOOGLE_MAPS_API_KEY", "never-log-this-key");
    loader.importLibrary.mockRejectedValue(new Error("provider details"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const maps = await import("./google-maps");

    await expect(maps.loadGoogleMapsLibraries()).rejects.toBeInstanceOf(
      maps.GoogleMapsLoadError,
    );
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
  });
});
