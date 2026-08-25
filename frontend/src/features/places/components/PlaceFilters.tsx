import { PROPERTY_TYPES } from "../../properties/types/property.types";
import type {
  PublicAmenity,
  PublicPlaceQuery,
} from "../types/place.types";

interface PlaceFiltersProps {
  amenities: PublicAmenity[];
  query: PublicPlaceQuery;
  onChange: (
    updates: Record<string, string | number | boolean | undefined>,
  ) => void;
}

function displayType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PlaceFilters({
  amenities,
  query,
  onChange,
}: PlaceFiltersProps) {
  const selectedAmenities = query.amenities ?? [];

  function toggleAmenity(code: string): void {
    const next = selectedAmenities.includes(code)
      ? selectedAmenities.filter((item) => item !== code)
      : [...selectedAmenities, code];
    onChange({ amenities: next.length ? next.join(",") : undefined, page: 1 });
  }

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-black text-slate-950">Filter places</h2>
        <button
          className="min-h-11 text-sm font-bold text-emerald-800 hover:text-emerald-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          type="button"
          onClick={() =>
            onChange({
              district: undefined,
              city: undefined,
              propertyType: undefined,
              isFree: undefined,
              wheelchairAccessible: undefined,
              amenities: undefined,
              page: 1,
            })
          }
        >
          Clear filters
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        <label className="text-sm font-bold text-slate-700">
          District
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            value={query.district ?? ""}
            maxLength={100}
            onChange={(event) =>
              onChange({ district: event.target.value || undefined, page: 1 })
            }
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          City
          <input
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            value={query.city ?? ""}
            maxLength={100}
            onChange={(event) =>
              onChange({ city: event.target.value || undefined, page: 1 })
            }
          />
        </label>
        <label className="text-sm font-bold text-slate-700">
          Place type
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            value={query.propertyType ?? ""}
            onChange={(event) =>
              onChange({
                propertyType: event.target.value || undefined,
                page: 1,
              })
            }
          >
            <option value="">All types</option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {displayType(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-bold text-slate-700">
          Cost
          <select
            className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100"
            value={
              query.isFree === undefined ? "" : query.isFree ? "true" : "false"
            }
            onChange={(event) =>
              onChange({ isFree: event.target.value || undefined, page: 1 })
            }
          >
            <option value="">Free and paid</option>
            <option value="true">Free</option>
            <option value="false">Paid</option>
          </select>
        </label>
      </div>

      <label className="mt-5 flex min-h-11 items-center gap-3 rounded-xl bg-slate-50 px-3 text-sm font-bold text-slate-800">
        <input
          className="size-5 accent-emerald-700"
          type="checkbox"
          checked={query.wheelchairAccessible === true}
          onChange={(event) =>
            onChange({
              wheelchairAccessible: event.target.checked ? true : undefined,
              page: 1,
            })
          }
        />
        Wheelchair accessible
      </label>

      {amenities.length ? (
        <fieldset className="mt-5">
          <legend className="text-sm font-black text-slate-800">Amenities</legend>
          <div className="mt-2 space-y-1">
            {amenities.map((amenity) => (
              <label
                className="flex min-h-10 items-center gap-3 rounded-lg px-2 text-sm text-slate-700 hover:bg-slate-50"
                key={amenity.code}
              >
                <input
                  className="size-4 accent-emerald-700"
                  type="checkbox"
                  checked={selectedAmenities.includes(amenity.code)}
                  onChange={() => toggleAmenity(amenity.code)}
                />
                {amenity.name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </aside>
  );
}
