import { Link } from "react-router-dom";
import type { PublicPlaceListItem } from "../types/place.types";
import { AmenityList } from "./AmenityList";
import { PlacePhoto } from "./PlacePhoto";
import { useLanguage } from "../../../i18n/useLanguage";

function displayType(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function PlaceCard({ place }: { place: PublicPlaceListItem }) {
  const { t } = useLanguage();
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      {place.coverImage ? (
        <PlacePhoto
          className="aspect-[16/9] w-full bg-slate-100 object-cover"
          src={place.coverImage.url}
          alt={
            place.coverImage.altText ??
            t("Photo of {name}", { name: place.name })
          }
        />
      ) : (
        <div className="grid aspect-[16/9] place-items-center bg-gradient-to-br from-brand-100 to-brand-100 px-6 text-center font-black text-brand-900/60">
          {t("No approved photo yet")}
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
            {t(displayType(place.propertyType))}
          </span>
          <span className="rounded-full bg-brand-100 px-2.5 py-1 text-brand-800">
            {t("Verified")}
          </span>
          <span className="ml-auto text-slate-600">
            {place.isFree
              ? t("Free")
              : place.feeLkr === null
                ? t("Fee applies")
                : `LKR ${place.feeLkr.toLocaleString()}`}
          </span>
        </div>
        <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950">
          <Link
            className="rounded-sm outline-none after:absolute focus-visible:ring-2 focus-visible:ring-brand-700"
            to={`/places/${place.propertyId}`}
          >
            {place.name}
          </Link>
        </h2>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {place.city}, {place.district}
          {place.distanceKm !== null
            ? ` · ${t("{distance} km away", { distance: place.distanceKm })}`
            : ""}
        </p>
        {place.shortDescription ? (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
            {place.shortDescription}
          </p>
        ) : null}
        <div className="mt-4">
          <AmenityList amenities={place.amenities.slice(0, 3)} />
        </div>
        <Link
          className="mt-auto inline-flex min-h-11 items-center pt-5 text-sm font-extrabold text-brand-800 hover:text-brand-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          to={`/places/${place.propertyId}`}
        >
          {t("View place details")} <span aria-hidden="true">&nbsp;&rarr;</span>
        </Link>
      </div>
    </article>
  );
}
