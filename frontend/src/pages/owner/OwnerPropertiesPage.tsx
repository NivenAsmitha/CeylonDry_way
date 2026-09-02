import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { PropertyStatusBadge } from "../../features/properties/components/PropertyStatusBadge";
import { PlacePhoto } from "../../features/places/components/PlacePhoto";
import {
  useDeleteOwnedProperty,
  useOwnerProperties,
  useStartPropertyRevision,
} from "../../features/properties/hooks/useOwnerProperties";
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
  const navigate = useNavigate();
  const propertiesQuery = useOwnerProperties(workflow);
  const deleteProperty = useDeleteOwnedProperty();
  const startRevision = useStartPropertyRevision();
  const [propertyToDelete, setPropertyToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [propertyToRevise, setPropertyToRevise] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const isReviewer = workflow === "reviewer";
  const createPath = isReviewer ? "/reviewer/properties/new" : "/list-property";
  const collectionPath = isReviewer
    ? "/reviewer/properties"
    : "/owner/properties";

  if (propertiesQuery.isPending) {
    return <LoadingScreen message="Loading your properties..." />;
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
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
          className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-700 px-5 font-extrabold text-white"
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

      {startRevision.isError ? (
        <div className="mt-8">
          <ErrorMessage
            title="Property revision could not be started"
            message={getApiErrorMessage(startRevision.error)}
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
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-6 font-extrabold text-white"
            to={createPath}
          >
            {isReviewer ? "Add property manually" : "List Your Property"}
          </Link>
        </div>
      ) : null}

      {propertiesQuery.data?.items.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {propertiesQuery.data.items.map((property) => (
            <article
              className="flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              key={property.id}
            >
              {property.activeVersion.photos.length ? (
                <PlacePhoto
                  className="aspect-[16/9] w-full bg-slate-100 object-cover"
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
              ) : (
                <div className="grid aspect-[16/9] place-items-center bg-gradient-to-br from-brand-100 to-brand-50 px-5 text-center text-sm font-black text-brand-900/60">
                  No approved photo yet
                </div>
              )}
              <div className="flex flex-1 flex-col p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Version {property.activeVersion.version}
                    </p>
                    <h2 className="mt-1 line-clamp-2 text-lg font-black text-slate-950">
                      {property.activeVersion.name || "Untitled property"}
                    </h2>
                  </div>
                  <PropertyStatusBadge status={property.lifecycleStatus} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
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
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-sm text-amber-950">
                    <p className="font-black">
                      Latest review:{" "}
                      {formatDecision(property.latestDecision.decision)}
                    </p>
                    {property.latestDecision.reason ? (
                      <p className="mt-2 line-clamp-3 whitespace-pre-wrap">
                        {property.latestDecision.reason}
                      </p>
                    ) : (
                      <p className="mt-2 text-amber-800">
                        No reviewer reason was provided.
                      </p>
                    )}
                    {property.lifecycleStatus === "CHANGES_REQUESTED" ||
                    property.lifecycleStatus === "UPDATE_CHANGES_REQUESTED" ? (
                      <p className="mt-2 font-semibold">
                        Editing and resubmission are available after you address
                        this feedback.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mt-auto flex flex-wrap gap-2 pt-5">
                  {property.canStartRevision && !isReviewer ? (
                    <button
                      className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-50"
                      type="button"
                      disabled={startRevision.isPending}
                      onClick={() => {
                        startRevision.reset();
                        setPropertyToRevise({
                          id: property.id,
                          name:
                            property.activeVersion.name || "Untitled property",
                        });
                      }}
                    >
                      {startRevision.isPending &&
                      startRevision.variables === property.id
                        ? "Preparing…"
                        : "Edit property"}
                    </button>
                  ) : (
                    <Link
                      className="inline-flex min-h-10 items-center rounded-xl bg-slate-950 px-4 text-sm font-bold text-white"
                      to={`${collectionPath}/${property.id}/edit`}
                    >
                      {property.canEdit ? "Edit" : "View"}
                    </Link>
                  )}
                  {property.canSubmit ? (
                    <Link
                      className="inline-flex min-h-10 items-center rounded-xl border border-amber-400 bg-amber-50 px-3 text-sm font-bold text-amber-950"
                      to={`${collectionPath}/${property.id}/edit?step=7`}
                    >
                      Review and submit
                    </Link>
                  ) : null}
                  {!isReviewer ? (
                    <button
                      className="ml-auto inline-flex min-h-10 items-center rounded-xl px-3 text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                      type="button"
                      onClick={() => {
                        setPropertyToDelete({
                          id: property.id,
                          name:
                            property.activeVersion.name || "Untitled property",
                        });
                        setDeleteConfirmation("");
                        deleteProperty.reset();
                      }}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {propertyToRevise ? (
        <ConfirmationDialog
          title={`Edit ${propertyToRevise.name}?`}
          description="A private revision will be created for your changes. The currently approved version will remain public until a reviewer approves the revision."
          confirmLabel="Create private revision"
          isPending={startRevision.isPending}
          onCancel={() => setPropertyToRevise(null)}
          onConfirm={() =>
            void startRevision
              .mutateAsync(propertyToRevise.id)
              .then(() => {
                const propertyId = propertyToRevise.id;
                setPropertyToRevise(null);
                navigate(`${collectionPath}/${propertyId}/edit`);
              })
              .catch(() => undefined)
          }
        />
      ) : null}

      {propertyToDelete ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !deleteProperty.isPending
            ) {
              setPropertyToDelete(null);
            }
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-property-title"
          >
            <p className="text-sm font-bold text-red-700">Remove property</p>
            <h2
              className="mt-1 text-2xl font-black text-slate-950"
              id="delete-property-title"
            >
              Delete {propertyToDelete.name}?
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              The listing will immediately disappear from your workspace and
              from all public results. Its audit record is retained.
            </p>
            {deleteProperty.isError ? (
              <div className="mt-5">
                <ErrorMessage
                  title="Property could not be deleted"
                  message={getApiErrorMessage(deleteProperty.error)}
                />
              </div>
            ) : null}
            <label
              className="mt-5 block text-sm font-bold"
              htmlFor="delete-property-confirmation"
            >
              Type{" "}
              <span className="text-slate-950">{propertyToDelete.name}</span> to
              confirm
            </label>
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100"
              id="delete-property-confirmation"
              value={deleteConfirmation}
              autoComplete="off"
              onChange={(event) => setDeleteConfirmation(event.target.value)}
            />
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                className="min-h-11 rounded-xl border border-slate-300 px-5 font-bold text-slate-700"
                type="button"
                disabled={deleteProperty.isPending}
                onClick={() => setPropertyToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="min-h-11 rounded-xl bg-red-700 px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
                disabled={
                  deleteProperty.isPending ||
                  deleteConfirmation !== propertyToDelete.name
                }
                onClick={() =>
                  void deleteProperty
                    .mutateAsync(propertyToDelete.id)
                    .then(() => setPropertyToDelete(null))
                    .catch(() => undefined)
                }
              >
                {deleteProperty.isPending ? "Deleting..." : "Delete property"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
