import { Link, useParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { AmenityList } from "../../features/places/components/AmenityList";
import { DirectionsButton } from "../../features/places/components/DirectionsButton";
import { usePublicPlace } from "../../features/places/hooks/usePlaces";
import { getApiErrorMessage, normalizeApiError } from "../../types/api.types";

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

function hourText(hour: {
  isClosed: boolean;
  is24Hours: boolean;
  openTime: string | null;
  closeTime: string | null;
}): string {
  if (hour.isClosed) return "Closed";
  if (hour.is24Hours) return "Open 24 hours";
  if (hour.openTime && hour.closeTime) return `${hour.openTime} - ${hour.closeTime}`;
  return "Hours not specified";
}

export function PlaceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const query = usePublicPlace(id);

  if (query.isPending) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-96 animate-pulse rounded-3xl bg-slate-200" />
      </div>
    );
  }

  if (query.isError) {
    const notFound = normalizeApiError(query.error).statusCode === 404;
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <ErrorMessage
          title={notFound ? "Place not found" : "Place could not be loaded"}
          message={
            notFound
              ? "This place is unavailable or is not currently approved for public viewing."
              : getApiErrorMessage(query.error)
          }
        />
        <Link className="mt-6 inline-flex min-h-11 items-center font-bold text-emerald-800" to="/explore">
          &larr; Back to Explore
        </Link>
      </div>
    );
  }

  const place = query.data;
  if (!place) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link className="inline-flex min-h-11 items-center text-sm font-bold text-emerald-800" to="/explore">
        &larr; Back to Explore
      </Link>

      {place.photos.length ? (
        <div className="mt-3 grid gap-3 overflow-hidden rounded-3xl sm:grid-cols-2">
          {place.photos.slice(0, 3).map((photo, index) => (
            <img
              className={`w-full bg-slate-100 object-cover ${index === 0 ? "aspect-[4/3] sm:row-span-2 sm:h-full" : "aspect-[16/9]"}`}
              key={`${photo.url}-${index}`}
              src={photo.url}
              alt={photo.altText ?? ""}
            />
          ))}
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <article>
          <div className="flex flex-wrap items-center gap-2 text-xs font-black">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">Verified</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
              {place.propertyType.replaceAll("_", " ")}
            </span>
            {place.wheelchairAccessible ? (
              <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-800">Wheelchair accessible</span>
            ) : null}
          </div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {place.name}
          </h1>
          <p className="mt-2 font-semibold text-slate-600">
            {place.address}, {place.city}, {place.district}
          </p>
          {place.description ? (
            <p className="mt-6 whitespace-pre-line text-base leading-8 text-slate-700">
              {place.description}
            </p>
          ) : null}

          <section className="mt-8 border-t border-slate-200 pt-7">
            <h2 className="text-2xl font-black text-slate-950">Amenities</h2>
            <div className="mt-4"><AmenityList amenities={place.amenities} /></div>
          </section>

          {place.accessNotes ? (
            <section className="mt-8 border-t border-slate-200 pt-7">
              <h2 className="text-2xl font-black text-slate-950">Access notes</h2>
              <p className="mt-3 leading-7 text-slate-700">{place.accessNotes}</p>
            </section>
          ) : null}

          <section className="mt-8 border-t border-slate-200 pt-7">
            <h2 className="text-2xl font-black text-slate-950">Opening hours</h2>
            {place.openingHours.length ? (
              <dl className="mt-4 max-w-lg divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white px-4">
                {place.openingHours.map((hour) => (
                  <div className="flex justify-between gap-4 py-3 text-sm" key={hour.weekday}>
                    <dt className="font-bold text-slate-800">{weekdayNames[hour.weekday]}</dt>
                    <dd className="text-right text-slate-600">{hourText(hour)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-slate-600">Opening hours have not been provided.</p>
            )}
          </section>
        </article>

        <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
          <p className="text-sm font-bold text-slate-500">Entry</p>
          <p className="mt-1 text-2xl font-black text-slate-950">
            {place.isFree
              ? "Free"
              : place.feeLkr === null
                ? "Fee applies"
                : `LKR ${place.feeLkr.toLocaleString()}`}
          </p>
          {place.distanceKm !== null ? (
            <p className="mt-2 text-sm text-slate-600">{place.distanceKm} km away</p>
          ) : null}
          <div className="mt-5"><DirectionsButton url={place.directionsUrl} /></div>
          <div className="mt-6 border-t border-slate-200 pt-5">
            <h2 className="font-black text-slate-950">Verified location</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}. The
              directions link uses these stored approved coordinates.
            </p>
          </div>

          {(place.phone || place.email || place.website) ? (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h2 className="font-black text-slate-950">Public contact</h2>
              <div className="mt-3 space-y-2 break-words text-sm text-slate-700">
                {place.phone ? <p><a className="text-emerald-800 underline" href={`tel:${place.phone}`}>{place.phone}</a></p> : null}
                {place.email ? <p><a className="text-emerald-800 underline" href={`mailto:${place.email}`}>{place.email}</a></p> : null}
                {place.website ? <p><a className="text-emerald-800 underline" href={place.website} target="_blank" rel="noopener noreferrer">Visit website</a></p> : null}
              </div>
            </div>
          ) : null}

          <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-500">
            Report a problem will be available in a future phase.
          </div>
        </aside>
      </div>
    </div>
  );
}
