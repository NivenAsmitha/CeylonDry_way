import { lazy, Suspense, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { NearMeButton } from "../../features/places/components/NearMeButton";
import { PlaceFilters } from "../../features/places/components/PlaceFilters";
import { PlacePhoto } from "../../features/places/components/PlacePhoto";
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

function displayType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
      className={`overflow-hidden rounded-2xl border bg-white transition ${
        selected
          ? "border-brand-600 shadow-lg ring-2 ring-brand-100"
          : "border-slate-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
      }`}
      aria-current={selected ? "true" : undefined}
    >
      {place.coverImage ? (
        <PlacePhoto
          className="aspect-[16/8] w-full object-cover"
          src={place.coverImage.url}
          alt={place.coverImage.altText ?? `Photo of ${place.name}`}
        />
      ) : (
        <div className="grid aspect-[16/8] place-items-center bg-gradient-to-br from-brand-100 to-brand-100 text-sm font-black text-brand-900/60">
          Verified facility
        </div>
      )}
      <div className="p-5">
        <button
          className="w-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          type="button"
          aria-pressed={selected}
          onClick={onSelect}
        >
          <span className="flex items-start justify-between gap-3">
            <span className="font-black text-slate-950">{place.name}</span>
            <span className="shrink-0 rounded-full bg-brand-100 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-brand-800">
              Verified
            </span>
          </span>
          <span className="mt-1 block text-sm text-slate-600">
            {place.city}, {place.district}
          </span>
          <span className="mt-3 block text-xs font-bold uppercase tracking-wide text-slate-500">
            {displayType(place.propertyType)} · {place.isFree ? "Free" : "Paid"}
            {place.distanceKm !== null ? ` · ${place.distanceKm} km` : ""}
          </span>
          {selected ? (
            <span className="mt-3 block text-xs font-black uppercase tracking-wide text-brand-800">
              Selected on map
            </span>
          ) : null}
        </button>
        <Link
          className="mt-4 inline-flex min-h-10 items-center text-sm font-black text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          to={`/places/${place.propertyId}`}
          aria-label="View place details"
        >
          View place details&nbsp; →
        </Link>
      </div>
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
    const search = new FormData(event.currentTarget).get("search");
    updateFilters({
      search:
        typeof search === "string" ? search.trim() || undefined : undefined,
      page: 1,
    });
  }

  const data = placesQuery.data;
  const places = data?.items ?? [];
  const selectedPlace = places.find(
    (place) => place.propertyId === selectedPropertyId,
  );

  return (
    <div className="bg-[#f7fafc] pb-20">
      <section className="border-b border-brand-100 bg-gradient-to-r from-brand-50 via-white to-amber-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
                Explore by location
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Find verified facilities on the map.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
                Search across Sri Lanka, narrow the results to the amenities you
                need, and open precise directions for your journey.
              </p>
            </div>
            <div className="flex gap-8 text-sm">
              <div>
                <p className="text-3xl font-black text-slate-950">
                  {data?.pagination.total ?? "—"}
                </p>
                <p className="mt-1 text-slate-500">Matching places</p>
              </div>
              <div className="border-l border-slate-200 pl-8">
                <p className="text-3xl font-black text-slate-950">50</p>
                <p className="mt-1 text-slate-500">Shown per map</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <form
          className="relative z-10 -mt-14 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/10 sm:flex-row"
          onSubmit={submitSearch}
        >
          <label className="sr-only" htmlFor="map-place-search">
            Search mapped places
          </label>
          <div className="flex min-h-14 flex-1 items-center gap-3 rounded-xl bg-slate-50 px-4">
            <span className="text-xl text-brand-700" aria-hidden="true">
              ⌕
            </span>
            <input
              className="min-w-0 flex-1 border-0 bg-transparent outline-none placeholder:text-slate-500"
              id="map-place-search"
              name="search"
              type="search"
              maxLength={100}
              defaultValue={query.search ?? ""}
              key={query.search ?? ""}
              placeholder="Search place, city, or district"
            />
          </div>
          <button
            className="min-h-14 rounded-xl bg-brand-700 px-7 font-black text-white transition hover:bg-brand-800"
            type="submit"
          >
            Search map
          </button>
        </form>

        <div className="mt-7 grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          <div className="space-y-5 xl:sticky xl:top-24">
            <section className="rounded-3xl border border-brand-200 bg-brand-50 p-5 text-slate-900 shadow-sm">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-800">
                Use your location
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Find nearby verified facilities. Your location is used only for
                this search and is not stored.
              </p>
              <div className="mt-4">
                <NearMeButton
                  active={query.latitude !== undefined}
                  onLocated={(latitude, longitude) =>
                    updateLocation(latitude, longitude)
                  }
                  onClear={() => updateLocation(undefined, undefined)}
                />
              </div>
              {query.latitude !== undefined ? (
                <label className="mt-4 block text-sm font-bold text-slate-800">
                  Search radius
                  <select
                    className="mt-2 min-h-11 w-full rounded-xl border border-brand-200 bg-white px-3 font-normal text-slate-900"
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
            </section>

            <PlaceFilters
              amenities={data?.availableAmenities ?? []}
              query={query}
              onChange={updateFilters}
            />
          </div>

          <div className="min-w-0">
            {placesQuery.isError ? (
              <div className="mb-5">
                <ErrorMessage message={getApiErrorMessage(placesQuery.error)} />
              </div>
            ) : null}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-2.5 shadow-lg shadow-slate-900/8">
              <Suspense
                fallback={
                  <div
                    className="grid min-h-[36rem] place-items-center rounded-[1.4rem] bg-slate-100 text-sm font-semibold text-slate-600"
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
            </div>

            {selectedPlace ? (
              <aside
                className="mt-4 flex flex-col justify-between gap-4 rounded-2xl border border-brand-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                aria-live="polite"
              >
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-brand-700">
                    Selected verified place
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {selectedPlace.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedPlace.city}, {selectedPlace.district} ·{" "}
                    {selectedPlace.isFree ? "Free" : "Paid"}
                    {selectedPlace.wheelchairAccessible
                      ? " · Wheelchair accessible"
                      : ""}
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-11 shrink-0 items-center rounded-xl bg-slate-950 px-5 font-black text-white"
                  to={`/places/${selectedPlace.propertyId}`}
                >
                  Open full details
                </Link>
              </aside>
            ) : null}
          </div>
        </div>

        <section
          className="mt-16"
          aria-live="polite"
          aria-busy={placesQuery.isFetching}
        >
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                Map results
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                {data
                  ? `${data.pagination.total} verified places`
                  : "Verified places"}
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-slate-600">
              Select a card to focus its marker, or open the full page for
              amenities, photos and directions.
            </p>
          </div>
          {placesQuery.isPending ? (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  className="h-80 animate-pulse rounded-2xl bg-slate-200"
                  key={item}
                />
              ))}
            </div>
          ) : places.length ? (
            <ol className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
            <p className="mt-7 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
              No verified places match these filters. Try a broader city,
              district, or radius.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
