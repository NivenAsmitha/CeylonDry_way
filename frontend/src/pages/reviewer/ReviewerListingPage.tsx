import { Link, useParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { PropertyStatusBadge } from "../../features/properties/components/PropertyStatusBadge";
import { PROPERTY_TYPE_LABELS } from "../../features/properties/property.constants";
import { ReviewerDecisionForm } from "../../features/reviewer/components/ReviewerDecisionForm";
import { useReviewerListing } from "../../features/reviewer/hooks/useReviewerListings";
import { REVIEW_DECISION_LABELS } from "../../features/reviewer/reviewer.constants";
import { getApiErrorMessage } from "../../types/api.types";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function displayValue(value: string | number | null): string {
  return value === null || value === "" ? "Not provided" : String(value);
}

export function ReviewerListingPage() {
  const { id } = useParams();
  const query = useReviewerListing(id);

  if (query.isPending) {
    return <LoadingScreen message="Loading submitted listing..." />;
  }

  if (query.isError || !query.data) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <ErrorMessage
          title="Reviewer listing unavailable"
          message={getApiErrorMessage(query.error)}
        />
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-5 font-bold text-white"
          to="/reviewer"
        >
          Return to reviewer queue
        </Link>
      </section>
    );
  }

  const listing = query.data;
  const version = listing.submittedVersion;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Reviewer workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {version.name || "Untitled property"}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <PropertyStatusBadge status={listing.lifecycleStatus} />
            <span className="text-sm text-slate-600">
              Submitted {formatDate(version.submittedAt)} · Version{" "}
              {version.version}
            </span>
          </div>
        </div>
        <Link
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-bold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          to="/reviewer"
        >
          Reviewer queue
        </Link>
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Basic details</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-slate-500">Type</dt>
                <dd className="mt-1 font-bold">
                  {version.propertyType
                    ? PROPERTY_TYPE_LABELS[version.propertyType]
                    : "Not provided"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-slate-500">Owner</dt>
                <dd className="mt-1 font-bold">{listing.owner.name}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-slate-500">
                  Organisation
                </dt>
                <dd className="mt-1 font-bold">
                  {displayValue(version.organisation)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-slate-500">
                  Description
                </dt>
                <dd className="mt-2 whitespace-pre-wrap text-slate-700">
                  {displayValue(version.description)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Amenities</h2>
            {version.amenities.length ? (
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {version.amenities.map((amenity) => (
                  <li
                    className="rounded-xl bg-emerald-50 px-4 py-3 font-semibold text-emerald-950"
                    key={amenity.code}
                  >
                    {amenity.name}
                    {amenity.notes ? (
                      <span className="mt-1 block text-xs font-normal">
                        {amenity.notes}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-slate-600">No amenities selected.</p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Access and fee</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-slate-500">Access</dt>
                <dd className="mt-1 font-bold">
                  {version.isFree
                    ? "Free"
                    : version.feeLkr === null
                      ? "Paid · fee not provided"
                      : `LKR ${version.feeLkr.toLocaleString("en-LK")}`}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-sm font-semibold text-slate-500">
                  Access notes
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-slate-700">
                  {displayValue(version.accessNotes)}
                </dd>
              </div>
            </dl>

            <h3 className="mt-7 font-black">Opening hours</h3>
            {version.openingHours.length ? (
              <ul className="mt-3 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                {version.openingHours.map((openingHour) => (
                  <li
                    className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
                    key={openingHour.weekday}
                  >
                    <span className="font-bold">
                      {WEEKDAYS[openingHour.weekday] ??
                        `Day ${openingHour.weekday}`}
                    </span>
                    <span className="text-slate-600">
                      {openingHour.isClosed
                        ? "Closed"
                        : openingHour.is24Hours
                          ? "Open 24 hours"
                          : `${openingHour.openTime ?? "?"}–${openingHour.closeTime ?? "?"}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-slate-600">No opening hours supplied.</p>
            )}
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Contact and location</h2>
            <dl className="mt-5 grid gap-5 sm:grid-cols-2">
              {[
                ["Phone", version.phone],
                ["Email", version.email],
                ["Website", version.website],
                ["Address", version.address],
                ["District", version.district],
                ["City", version.city],
                ["Latitude", version.latitude],
                ["Longitude", version.longitude],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-sm font-semibold text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words font-bold">
                    {displayValue(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Decision history</h2>
            {listing.decisionHistory.length ? (
              <ol className="mt-5 space-y-4">
                {listing.decisionHistory.map((decision) => (
                  <li
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    key={decision.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-black">
                        {REVIEW_DECISION_LABELS[decision.decision]}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(decision.createdAt)} ·{" "}
                        {decision.reviewer.name}
                      </p>
                    </div>
                    {decision.reason ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {decision.reason}
                      </p>
                    ) : null}
                    {decision.fieldNotes?.length ? (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        {decision.fieldNotes.map((note) => (
                          <li key={`${decision.id}-${note.field}`}>
                            <span className="font-bold">{note.field}:</span>{" "}
                            {note.message}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-3 text-slate-600">No prior decisions.</p>
            )}
          </section>
        </div>

        <aside className="self-start rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:sticky xl:top-24">
          <h2 className="text-xl font-black">Apply decision</h2>
          <p className="mt-2 text-sm text-slate-600">
            The backend rechecks status, ownership, and concurrency before
            committing any decision.
          </p>
          <div className="mt-5">
            <ReviewerDecisionForm listing={listing} />
          </div>
        </aside>
      </div>
    </section>
  );
}
