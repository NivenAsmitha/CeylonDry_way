import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { NearMeButton } from "../../features/places/components/NearMeButton";
import { PlaceList } from "../../features/places/components/PlaceList";
import { usePublicPlaces } from "../../features/places/hooks/usePlaces";
import {
  parsePlaceQuery,
  updatePlaceParams,
} from "../../features/places/utils/place-query";
import { getApiErrorMessage } from "../../types/api.types";

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedQuery = useMemo(() => parsePlaceQuery(searchParams), [searchParams]);
  const query = { ...parsedQuery, page: 1, pageSize: 50 };
  const placesQuery = usePublicPlaces(query);

  function updateLocation(
    latitude: number | undefined,
    longitude: number | undefined,
  ): void {
    setSearchParams(
      (current) =>
        updatePlaceParams(current, {
          latitude: latitude?.toFixed(6),
          longitude: longitude?.toFixed(6),
          radiusKm: latitude === undefined ? undefined : 25,
          sort: latitude === undefined ? "newest" : "distance",
          page: 1,
        }),
      { replace: true },
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">
        Location view
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
        Map of verified places
      </h1>
      <p className="mt-3 max-w-2xl leading-7 text-slate-600">
        Browse public locations and open exact coordinates in Google Maps for directions.
      </p>

      <div className="mt-7 rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="text-lg font-black text-amber-950">Map preview unavailable</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
          This local setup has no supported map package and browser-restricted
          API key configured.
          The verified place list remains fully available, and every detail page
          includes a safe directions link using the stored coordinates.
        </p>
        <div className="mt-4 flex flex-wrap items-start gap-3">
          <NearMeButton
            active={query.latitude !== undefined}
            onLocated={(latitude, longitude) => updateLocation(latitude, longitude)}
            onClear={() => updateLocation(undefined, undefined)}
          />
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-950"
            to={{ pathname: "/explore", search: searchParams.toString() }}
          >
            Open all filters
          </Link>
        </div>
      </div>

      <section className="mt-8" aria-live="polite">
        <h2 className="mb-5 text-2xl font-black text-slate-950">
          {placesQuery.data
            ? `${placesQuery.data.pagination.total} mapped places`
            : "Mapped places"}
        </h2>
        {placesQuery.isPending ? (
          <p className="rounded-2xl bg-white p-6 text-slate-600">Loading places...</p>
        ) : placesQuery.isError ? (
          <ErrorMessage message={getApiErrorMessage(placesQuery.error)} />
        ) : placesQuery.data?.items.length ? (
          <PlaceList places={placesQuery.data.items} />
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
            No verified places match this location yet.
          </p>
        )}
      </section>
    </div>
  );
}
