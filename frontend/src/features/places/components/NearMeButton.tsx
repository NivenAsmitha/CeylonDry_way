import { useState } from "react";

interface NearMeButtonProps {
  active: boolean;
  onClear: () => void;
  onLocated: (latitude: number, longitude: number) => void;
}

function geolocationMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location permission was denied. You can still search by city or district.";
  }
  if (error.code === error.TIMEOUT) {
    return "Finding your location took too long. Please try again or use the filters.";
  }
  return "Your location is unavailable. You can still use all manual filters.";
}

export function NearMeButton({
  active,
  onClear,
  onLocated,
}: NearMeButtonProps) {
  const [isLocating, setIsLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function findNearMe(): void {
    if (!("geolocation" in navigator)) {
      setMessage(
        "Location is not supported by this browser. Use the city or district filters instead.",
      );
      return;
    }

    setIsLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        onLocated(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setIsLocating(false);
        setMessage(geolocationMessage(error));
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          className="min-h-11 rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:opacity-60"
          type="button"
          disabled={isLocating}
          onClick={findNearMe}
        >
          {isLocating ? "Finding your location..." : "Find places near me"}
        </button>
        {active ? (
          <button
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            type="button"
            onClick={onClear}
          >
            Clear location
          </button>
        ) : null}
      </div>
      {message ? (
        <p className="mt-2 max-w-xl text-sm text-amber-800" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
