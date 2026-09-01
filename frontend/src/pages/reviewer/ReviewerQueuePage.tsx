import { Link, useLocation, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { PropertyStatusBadge } from "../../features/properties/components/PropertyStatusBadge";
import {
  PROPERTY_TYPE_LABELS,
  getPropertyStatusLabel,
} from "../../features/properties/property.constants";
import { useReviewerListings } from "../../features/reviewer/hooks/useReviewerListings";
import {
  REVIEWER_QUEUE_STATUSES,
  type ReviewerQueueStatus,
} from "../../features/reviewer/types/reviewer.types";
import { getApiErrorMessage } from "../../types/api.types";

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function parseStatus(value: string | null): ReviewerQueueStatus {
  return (
    REVIEWER_QUEUE_STATUSES.find((status) => status === value) ?? "PENDING"
  );
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-LK", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function getSuccessMessage(state: unknown): string | null {
  if (
    typeof state === "object" &&
    state !== null &&
    "decisionSuccess" in state &&
    typeof state.decisionSuccess === "string"
  ) {
    return state.decisionSuccess;
  }

  return null;
}

export function ReviewerQueuePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const page = parsePage(searchParams.get("page"));
  const status = parseStatus(searchParams.get("status"));
  const query = useReviewerListings({ page, pageSize: 20, status });
  const successMessage = getSuccessMessage(location.state);

  function changeStatus(nextStatus: ReviewerQueueStatus): void {
    setSearchParams({ status: nextStatus, page: "1" });
  }

  function changePage(nextPage: number): void {
    setSearchParams({ status, page: String(nextPage) });
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
            Reviewer workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Listing review queue
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Review submitted versions and apply only valid lifecycle decisions.
          </p>
        </div>
        <div>
          <label
            className="mb-2 block text-sm font-bold"
            htmlFor="queue-status"
          >
            Queue status
          </label>
          <select
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            id="queue-status"
            value={status}
            onChange={(event) =>
              changeStatus(event.target.value as ReviewerQueueStatus)
            }
          >
            {REVIEWER_QUEUE_STATUSES.map((queueStatus) => (
              <option key={queueStatus} value={queueStatus}>
                {getPropertyStatusLabel(queueStatus)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {successMessage ? (
        <div
          className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-4 font-semibold text-brand-950"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}

      {query.isPending ? (
        <div className="mt-10">
          <LoadingScreen message="Loading reviewer queue..." />
        </div>
      ) : null}

      {query.isError ? (
        <div className="mt-8">
          <ErrorMessage
            title="Reviewer queue could not be loaded"
            message={getApiErrorMessage(query.error)}
          />
        </div>
      ) : null}

      {query.data?.items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-2xl font-black">No listings in this queue</h2>
          <p className="mt-2 text-slate-600">
            There are currently no{" "}
            {getPropertyStatusLabel(status).toLowerCase()} listings.
          </p>
        </div>
      ) : null}

      {query.data?.items.length ? (
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-200">
            {query.data.items.map((item) => (
              <li className="p-5 sm:p-6" key={item.propertyId}>
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <h2 className="truncate text-xl font-black text-slate-950">
                        {item.name || "Untitled property"}
                      </h2>
                      <PropertyStatusBadge status={item.lifecycleStatus} />
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      {item.propertyType
                        ? PROPERTY_TYPE_LABELS[item.propertyType]
                        : "Type not provided"}
                      {" · "}
                      {[item.city, item.district].filter(Boolean).join(", ") ||
                        "Location not provided"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Submitted {formatDate(item.submittedAt)} · Version{" "}
                      {item.version}
                    </p>
                  </div>
                  <Link
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 px-5 text-sm font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                    to={`/reviewer/listings/${item.propertyId}`}
                  >
                    Open review
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {query.data && query.data.pagination.totalPages > 1 ? (
        <nav
          className="mt-6 flex items-center justify-between gap-4"
          aria-label="Reviewer queue pagination"
        >
          <button
            className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40"
            type="button"
            disabled={page <= 1}
            onClick={() => changePage(page - 1)}
          >
            Previous
          </button>
          <p className="text-sm font-semibold text-slate-600">
            Page {page} of {query.data.pagination.totalPages}
          </p>
          <button
            className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40"
            type="button"
            disabled={page >= query.data.pagination.totalPages}
            onClick={() => changePage(page + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
