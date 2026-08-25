import { useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { NearMeButton } from "../../features/places/components/NearMeButton";
import { PlaceFilters } from "../../features/places/components/PlaceFilters";
import { PlaceList } from "../../features/places/components/PlaceList";
import { usePublicPlaces } from "../../features/places/hooks/usePlaces";
import {
  parsePlaceQuery,
  updatePlaceParams,
} from "../../features/places/utils/place-query";
import { getApiErrorMessage } from "../../types/api.types";

export function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useMemo(() => parsePlaceQuery(searchParams), [searchParams]);
  const searchTimer = useRef<number | undefined>(undefined);
  const placesQuery = usePublicPlaces(query);

  useEffect(() => {
    return () => window.clearTimeout(searchTimer.current);
  }, []);

  function updateSearch(value: string): void {
    window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => {
      setSearchParams(
        (current) =>
          updatePlaceParams(current, {
            search: value.trim() || undefined,
            page: 1,
          }),
        { replace: true },
      );
    }, 350);
  }

  function updateFilters(
    updates: Record<string, string | number | boolean | undefined>,
  ): void {
    setSearchParams((current) => updatePlaceParams(current, updates), {
      replace: true,
    });
  }

  function useLocation(latitude: number, longitude: number): void {
    updateFilters({
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      radiusKm: 25,
      sort: "distance",
      page: 1,
    });
  }

  function clearLocation(): void {
    updateFilters({
      latitude: undefined,
      longitude: undefined,
      radiusKm: undefined,
      sort: query.sort === "distance" ? "newest" : query.sort,
      page: 1,
    });
  }

  const data = placesQuery.data;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">
          Verified public directory
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
          Explore accessible places
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-slate-600">
          Search approved facilities across Sri Lanka. Every result reflects
          the latest version accepted by a reviewer.
        </p>
      </div>

      <div className="mt-8 rounded-3xl bg-emerald-950 p-4 shadow-lg sm:p-6">
        <label className="block text-sm font-bold text-emerald-50" htmlFor="place-search">
          Search by place, city, district, address, or description
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <input
            className="min-h-12 flex-1 rounded-xl border-0 bg-white px-4 text-slate-950 outline-none ring-2 ring-transparent focus:ring-amber-300"
            id="place-search"
            key={query.search ?? ""}
            type="search"
            maxLength={100}
            placeholder="Try Colombo, accessible toilet, or rest stop"
            defaultValue={query.search ?? ""}
            onChange={(event) => updateSearch(event.target.value)}
          />
          <label className="sr-only" htmlFor="place-sort">
            Sort places
          </label>
          <select
            className="min-h-12 rounded-xl border-0 bg-white px-4 font-bold text-slate-800 outline-none focus:ring-2 focus:ring-amber-300"
            id="place-sort"
            value={query.sort}
            onChange={(event) => updateFilters({ sort: event.target.value, page: 1 })}
          >
            <option value="newest">Newest verified</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="city_asc">City A-Z</option>
            {query.latitude !== undefined ? (
              <option value="distance">Nearest first</option>
            ) : null}
          </select>
        </div>
      </div>

      <div
        className="mt-6 rounded-2xl border border-sky-200 bg-sky-50 p-4"
        id="near-me"
      >
        <p className="mb-3 max-w-2xl text-sm leading-6 text-sky-950">
          Use your location once to sort verified places by distance. It is
          requested only when you click and is never stored or tracked.
        </p>
        <NearMeButton
          active={query.latitude !== undefined}
          onLocated={useLocation}
          onClear={clearLocation}
        />
        {query.latitude !== undefined ? (
          <label className="mt-4 block max-w-xs text-sm font-bold text-slate-700">
            Search radius
            <select
              className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal"
              value={query.radiusKm ?? 25}
              onChange={(event) =>
                updateFilters({ radiusKm: event.target.value, page: 1 })
              }
            >
              <option value="5">Within 5 km</option>
              <option value="10">Within 10 km</option>
              <option value="25">Within 25 km</option>
              <option value="50">Within 50 km</option>
              <option value="100">Within 100 km</option>
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-8 grid gap-7 lg:grid-cols-[17rem_1fr]">
        <PlaceFilters
          amenities={data?.availableAmenities ?? []}
          query={query}
          onChange={updateFilters}
        />

        <section aria-live="polite" aria-busy={placesQuery.isFetching}>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                {data ? `${data.pagination.total} places found` : "Places"}
              </h2>
              {placesQuery.isFetching && data ? (
                <p className="mt-1 text-sm text-slate-500">Updating results...</p>
              ) : null}
            </div>
          </div>

          {placesQuery.isPending ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {[0, 1, 2, 3].map((item) => (
                <div
                  className="h-80 animate-pulse rounded-3xl bg-slate-200"
                  key={item}
                />
              ))}
            </div>
          ) : placesQuery.isError ? (
            <div>
              <ErrorMessage
                title="Places could not be loaded"
                message={getApiErrorMessage(placesQuery.error)}
              />
              <button
                className="mt-4 min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white"
                type="button"
                onClick={() => void placesQuery.refetch()}
              >
                Try again
              </button>
            </div>
          ) : data?.items.length ? (
            <>
              <PlaceList places={data.items} />
              <nav
                className="mt-8 flex items-center justify-between gap-4"
                aria-label="Place results pages"
              >
                <button
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={data.pagination.page <= 1}
                  onClick={() => updateFilters({ page: data.pagination.page - 1 })}
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-slate-600">
                  Page {data.pagination.page} of {Math.max(data.pagination.totalPages, 1)}
                </span>
                <button
                  className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-40"
                  type="button"
                  disabled={data.pagination.page >= data.pagination.totalPages}
                  onClick={() => updateFilters({ page: data.pagination.page + 1 })}
                >
                  Next
                </button>
              </nav>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <h2 className="text-xl font-black text-slate-950">No places match yet</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                Try a broader city or district, remove an amenity, or increase
                the Near Me radius. Private and unapproved listings never appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
