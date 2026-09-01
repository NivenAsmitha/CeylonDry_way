import { Link } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { PropertyStatusBadge } from "../../features/properties/components/PropertyStatusBadge";
import { PlacePhoto } from "../../features/places/components/PlacePhoto";
import { useOwnerProperties } from "../../features/properties/hooks/useOwnerProperties";
import { getPropertyStatusLabel } from "../../features/properties/property.constants";
import { getApiErrorMessage } from "../../types/api.types";
import type { PropertyWorkflow } from "../../features/properties/services/properties.service";

function formatUpdatedDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function formatDecision(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function OwnerPropertiesPage({
  workflow = "owner",
}: {
  workflow?: PropertyWorkflow;
}) {
  const propertiesQuery = useOwnerProperties(workflow);
  const isReviewer = workflow === "reviewer";
  const createPath = isReviewer ? "/reviewer/properties/new" : "/list-property";
  const collectionPath = isReviewer ? "/reviewer/properties" : "/owner/properties";

  if (propertiesQuery.isPending) {
    return <LoadingScreen message="Loading your properties..." />;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            {isReviewer ? "Reviewer workspace" : "Owner workspace"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {isReviewer ? "Manually added properties" : "My properties"}
          </h1>
          <p className="mt-2 text-slate-600">
            {isReviewer
              ? "Create verified-source drafts and send them through the normal independent review process."
              : "Continue private drafts and track listings submitted for review."}
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 font-extrabold text-white"
          to={createPath}
        >
          {isReviewer ? "Add property manually" : "List another property"}
        </Link>
      </div>

      {propertiesQuery.isError ? (
        <div className="mt-8">
          <ErrorMessage
            title="Properties could not be loaded"
            message={getApiErrorMessage(propertiesQuery.error)}
          />
        </div>
      ) : null}

      {propertiesQuery.data?.items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-2xl font-black">No property drafts yet</h2>
          <p className="mt-2 text-slate-600">
            Start a private draft and complete it at your own pace.
          </p>
          <Link
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-emerald-700 px-6 font-extrabold text-white"
            to={createPath}
          >
            {isReviewer ? "Add property manually" : "List Your Property"}
          </Link>
        </div>
      ) : null}

      {propertiesQuery.data?.items.length ? (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {propertiesQuery.data.items.map((property) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              key={property.id}
            >
              {property.activeVersion.photos.length ? (
                <PlacePhoto
                  className="mb-5 aspect-[16/7] w-full rounded-2xl object-cover"
                  src={
                    property.activeVersion.photos.find((photo) => photo.isCover)
                      ?.url ?? property.activeVersion.photos[0].url
                  }
                  alt={
                    property.activeVersion.photos.find((photo) => photo.isCover)
                      ?.altText ??
                    `Photo of ${property.activeVersion.name || "property"}`
                  }
                />
              ) : null}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Version {property.activeVersion.version}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950">
                    {property.activeVersion.name || "Untitled property"}
                  </h2>
                </div>
                <PropertyStatusBadge status={property.lifecycleStatus} />
              </div>
              <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-slate-500">Status</dt>
                  <dd className="mt-1 font-bold">
                    {getPropertyStatusLabel(property.lifecycleStatus)}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-slate-500">Updated</dt>
                  <dd className="mt-1 font-bold">
                    {formatUpdatedDate(property.updatedAt)}
                  </dd>
                </div>
              </dl>
              {property.latestDecision ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-black">
                    Latest review:{" "}
                    {formatDecision(property.latestDecision.decision)}
                  </p>
                  {property.latestDecision.reason ? (
                    <p className="mt-2 whitespace-pre-wrap">
                      {property.latestDecision.reason}
                    </p>
                  ) : (
                    <p className="mt-2 text-amber-800">
                      No reviewer reason was provided.
                    </p>
                  )}
                  {property.lifecycleStatus === "CHANGES_REQUESTED" ? (
                    <p className="mt-2 font-semibold">
                      Editing and resubmission are available after you address
                      this feedback.
                    </p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"
                  to={`${collectionPath}/${property.id}/edit`}
                >
                  {property.canEdit ? "Edit" : "View"}
                </Link>
                {property.canSubmit ? (
                  <Link
                    className="inline-flex min-h-11 items-center rounded-xl border border-amber-400 bg-amber-50 px-4 text-sm font-bold text-amber-950"
                    to={`${collectionPath}/${property.id}/edit?step=7`}
                  >
                    Review and submit
                  </Link>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
