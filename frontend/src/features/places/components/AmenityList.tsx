import type { PublicAmenity } from "../types/place.types";

export function AmenityList({ amenities }: { amenities: PublicAmenity[] }) {
  if (amenities.length === 0) {
    return <p className="text-sm text-slate-500">No amenities listed.</p>;
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label="Amenities">
      {amenities.map((amenity) => (
        <li
          className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800"
          key={amenity.code}
        >
          {amenity.name}
        </li>
      ))}
    </ul>
  );
}
