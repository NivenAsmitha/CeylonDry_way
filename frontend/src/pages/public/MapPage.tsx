import { lazy, Suspense, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { NearMeButton } from "../../features/places/components/NearMeButton";
import { PlaceFilters } from "../../features/places/components/PlaceFilters";
import { usePublicPlaces } from "../../features/places/hooks/usePlaces";
import type { PublicPlaceListItem } from "../../features/places/types/place.types";
import {
  parsePlaceQuery,
  updatePlaceParams,
} from "../../features/places/utils/place-query";
import { getApiErrorMessage } from "../../types/api.types";

const PublicPlacesMap = lazy(() =>
  import("../../features/maps/components/PublicPlacesMap").then((module) => ({
    default: module.PublicPlacesMap,
  })),
);

function PlaceMapResult({
  place,
  selected,
  onSelect,
}: {
  place: PublicPlaceListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li
      className={`rounded-2xl border p-4 ${
        selected
          ? "border-emerald-700 bg-emerald-50 ring-2 ring-emerald-200"
          : "border-slate-200 bg-white"
      }`}
      aria-current={selected ? "true" : undefined}
    >
      <button
        className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
      >
        <span className="flex items-start justify-between gap-3">
          <span className="font-black text-slate-950">{place.name}</span>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-black text-emerald-800">
            Verified
          </span>
        </span>
        <span className="mt-1 block text-sm text-slate-600">
          {place.city}, {place.district}
        </span>
        <span className="mt-2 block text-sm font-semibold text-slate-700">
          {place.isFree
            ? "Free entry"
            : place.feeLkr === null
              ? "Paid entry"
              : `LKR ${place.feeLkr.toLocaleString()}`}
          {place.wheelchairAccessible ? " · Wheelchair accessible" : ""}
          {place.distanceKm !== null ? ` · ${place.distanceKm} km away` : ""}
        </span>
        {selected ? (
          <span className="mt-2 block text-xs font-black uppercase tracking-wide text-emerald-800">
            Selected on map
          </span>
        ) : null}
      </button>
      <Link
        className="mt-3 inline-flex min-h-10 items-center text-sm font-black text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        to={`/places/${place.propertyId}`}
      >
        View place details
      </Link>
    </li>
  );
}

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const parsedQuery = useMemo(
    () => parsePlaceQuery(searchParams),
    [searchParams],
  );
  const query = { ...parsedQuery, page: 1, pageSize: 50 };
  const placesQuery = usePublicPlaces(query);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    null,
  );

  function updateFilters(
    updates: Record<string, string | number | boolean | undefined>,
  ): void {
    setSearchParams((current) => updatePlaceParams(current, updates), {
      replace: true,
    });
  }

  function updateLocation(
    latitude: number | undefined,
    longitude: number | undefined,
  ): void {
    updateFilters({
      latitude: latitude?.toFixed(6),
      longitude: longitude?.toFixed(6),
      radiusKm: latitude === undefined ? undefined : 25,
      sort: latitude === undefined ? "newest" : "distance",
      page: 1,
    });
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const search = form.get("search");
    updateFilters({
      search: typeof search === "string" ? search.trim() || undefined : undefined,
      page: 1,
    });
  }

  const data = placesQuery.data;
  const places = data?.items ?? [];
  const selectedPlace = places.find(
    (place) => place.propertyId === selectedPropertyId,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">
        Location view
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
        Map of verified places
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Map markers and the list below use only approved active property
        versions returned by the public API. The list remains available if the
        map cannot load.
      </p>

      <form
        className="mt-7 flex flex-col gap-3 rounded-2xl bg-emerald-950 p-4 sm:flex-row"
        onSubmit={submitSearch}
      >
        <label className="sr-only" htmlFor="map-place-search">
          Search mapped places
        </label>
        <input
          className="min-h-12 flex-1 rounded-xl bg-white px-4"
          id="map-place-search"
          name="search"
          type="search"
          maxLength={100}
          defaultValue={query.search ?? ""}
          key={query.search ?? ""}
          placeholder="Search place, city, or district"
        />
        <button
          className="min-h-12 rounded-xl bg-amber-300 px-5 font-black text-emerald-950"
          type="submit"
        >
          Search map
        </button>
      </form>

      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <p className="mb-3 max-w-2xl text-sm leading-6 text-sky-950">
          Near Me requests your position only after you click. It is used for
          this query and is never stored or continuously tracked.
        </p>
        <NearMeButton
          active={query.latitude !== undefined}
          onLocated={(latitude, longitude) =>
            updateLocation(latitude, longitude)
          }
          onClear={() => updateLocation(undefined, undefined)}
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
              {[5, 10, 25, 50, 100].map((radius) => (
                <option value={radius} key={radius}>
                  Within {radius} km
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <div className="mt-8 grid gap-7 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <PlaceFilters
          amenities={data?.availableAmenities ?? []}
          query={query}
          onChange={updateFilters}
        />

        <div className="min-w-0">
          <Suspense
            fallback={
              <div
                className="grid min-h-80 place-items-center rounded-3xl bg-slate-100 text-sm font-semibold text-slate-600 lg:min-h-[38rem]"
                role="status"
              >
                Loading map module…
              </div>
            }
          >
            <PublicPlacesMap
              places={places}
              selectedPropertyId={selectedPropertyId}
              onSelect={setSelectedPropertyId}
            />
          </Suspense>

          {selectedPlace ? (
            <aside className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-live="polite">
              <p className="text-xs font-black uppercase tracking-wide text-emerald-800">
                Selected verified place
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                {selectedPlace.name}
              </h2>
              <p className="mt-1 text-sm text-slate-700">
                {selectedPlace.city}, {selectedPlace.district} · {selectedPlace.isFree ? "Free" : "Paid"}
                {selectedPlace.wheelchairAccessible
                  ? " · Wheelchair accessible"
                  : ""}
              </p>
              <Link
                className="mt-3 inline-flex min-h-10 items-center font-black text-emerald-800 underline underline-offset-4"
                to={`/places/${selectedPlace.propertyId}`}
              >
                Open full details
              </Link>
            </aside>
          ) : null}
        </div>
      </div>

      <section className="mt-10" aria-live="polite" aria-busy={placesQuery.isFetching}>
        <h2 className="text-2xl font-black text-slate-950">
          {data ? `${data.pagination.total} verified places` : "Verified places"}
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Accessible text alternative to the map. Up to 50 matching places are
          shown at once.
        </p>
        {placesQuery.isPending ? (
          <p className="mt-5 rounded-2xl bg-white p-6 text-slate-600" role="status">
            Loading approved places…
          </p>
        ) : placesQuery.isError ? (
          <div className="mt-5">
            <ErrorMessage message={getApiErrorMessage(placesQuery.error)} />
          </div>
        ) : places.length ? (
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {places.map((place) => (
              <PlaceMapResult
                key={place.propertyId}
                place={place}
                selected={place.propertyId === selectedPropertyId}
                onSelect={() => setSelectedPropertyId(place.propertyId)}
              />
            ))}
          </ol>
        ) : (
          <p className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-slate-600">
            No verified places match these filters. Try a broader city,
            district, or radius.
          </p>
        )}
      </section>
    </div>
  );
}
