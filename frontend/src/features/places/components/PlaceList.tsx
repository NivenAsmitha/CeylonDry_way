import type { PublicPlaceListItem } from "../types/place.types";
import { PlaceCard } from "./PlaceCard";

export function PlaceList({ places }: { places: PublicPlaceListItem[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {places.map((place) => (
        <PlaceCard key={place.propertyId} place={place} />
      ))}
    </div>
  );
}
