import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { ManagementActionDialog } from "../../features/user-management/components/ManagementActionDialog";
import {
  REVIEW_MODERATION_STATUSES,
  type ReviewModerationAction,
  type ReviewModerationStatus,
} from "../../features/review-moderation/review-moderation.service";
import {
  useModerateReviewContent,
  useStaffReviews,
} from "../../features/review-moderation/useReviewModeration";
import { getApiErrorMessage } from "../../types/api.types";

interface PendingAction {
  target: "review" | "reply";
  id: string;
  action: ReviewModerationAction;
  label: string;
}

export function StaffReviewsPage() {
  const [params, setParams] = useSearchParams();
  const [pending, setPending] = useState<PendingAction | null>(null);
  const search = params.get("search") ?? "";
  const statusValue = params.get("status");
  const status = REVIEW_MODERATION_STATUSES.includes(
    statusValue as ReviewModerationStatus,
  )
    ? (statusValue as ReviewModerationStatus)
    : undefined;
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const reviews = useStaffReviews({ search: search || undefined, status, page });
  const moderation = useModerateReviewContent();

  function setFilter(key: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFilter("search", String(data.get("search") ?? "").trim());
  }

  async function confirm(reason: string): Promise<void> {
    if (!pending) return;
    try {
      await moderation.mutateAsync({ ...pending, reason });
      setPending(null);
    } catch {
      // The dialog displays the moderation error and remains open.
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
        Trust and safety
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
        Review moderation
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Review public visitor feedback and property-owner replies. Every hide or
        restore decision requires a reason and is recorded in the audit history.
      </p>

      <form
        className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_14rem_auto]"
        onSubmit={submitSearch}
      >
        <input
          className="min-h-12 rounded-xl border border-slate-300 px-4"
          name="search"
          defaultValue={search}
          placeholder="Search facility, client, email, or review"
          aria-label="Search reviews"
        />
        <select
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
          value={status ?? ""}
          onChange={(event) => setFilter("status", event.target.value)}
          aria-label="Review visibility"
        >
          <option value="">All visibility</option>
          <option value="VISIBLE">Visible</option>
          <option value="HIDDEN">Hidden</option>
        </select>
        <button
          className="min-h-12 rounded-xl bg-slate-950 px-6 font-black text-white"
          type="submit"
        >
          Search
        </button>
      </form>

      {reviews.isPending ? <LoadingScreen message="Loading reviews…" /> : null}
      {reviews.isError ? (
        <div className="mt-8">
          <ErrorMessage
            title="Reviews could not be loaded"
            message={getApiErrorMessage(reviews.error)}
          />
        </div>
      ) : null}

      {reviews.data ? (
        <div className="mt-6 space-y-4">
          {reviews.data.items.map((review) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              key={review.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${review.moderationStatus === "VISIBLE" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"}`}
                    >
                      {review.moderationStatus}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {review.property.activeVersion?.name ?? "Untitled property"}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-black text-slate-950">
                    {review.author.name}
                  </h2>
                  <p className="text-sm text-slate-500">{review.author.email}</p>
                </div>
                <Link
                  className="min-h-10 font-black text-brand-800"
                  to={`/places/${review.property.id}`}
                >
                  View facility →
                </Link>
              </div>
              <p className="mt-5 whitespace-pre-line rounded-xl bg-slate-50 p-4 leading-7 text-slate-700">
                {review.reviewText}
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs font-bold text-slate-500">
                <span>Cleanliness {review.cleanliness}/5</span>
                <span>Safety {review.safety}/5</span>
                <span>Accessibility {review.accessibility}/5</span>
                <span>Accuracy {review.accuracy}/5</span>
              </div>
              {review.moderationReason ? (
                <p className="mt-4 border-l-4 border-amber-400 pl-4 text-sm text-slate-600">
                  <strong>Latest moderation reason:</strong>{" "}
                  {review.moderationReason}
                </p>
              ) : null}
              {review.reply ? (
                <div className="mt-5 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-wide text-brand-800">
                      Property owner reply · {review.reply.moderationStatus}
                    </p>
                    <button
                      className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-black"
                      type="button"
                      onClick={() => {
                        moderation.reset();
                        setPending({
                          target: "reply",
                          id: review.reply!.id,
                          action:
                            review.reply!.moderationStatus === "VISIBLE"
                              ? "HIDE"
                              : "RESTORE",
                          label: "property-owner reply",
                        });
                      }}
                    >
                      {review.reply.moderationStatus === "VISIBLE"
                        ? "Hide reply"
                        : "Restore reply"}
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    {review.reply.message}
                  </p>
                </div>
              ) : null}
              <div className="mt-5 flex justify-end border-t border-slate-200 pt-5">
                <button
                  className={`min-h-11 rounded-xl px-5 text-sm font-black ${review.moderationStatus === "VISIBLE" ? "border border-red-200 text-red-700" : "bg-brand-700 text-white"}`}
                  type="button"
                  onClick={() => {
                    moderation.reset();
                    setPending({
                      target: "review",
                      id: review.id,
                      action:
                        review.moderationStatus === "VISIBLE" ? "HIDE" : "RESTORE",
                      label: "client review",
                    });
                  }}
                >
                  {review.moderationStatus === "VISIBLE"
                    ? "Hide review"
                    : "Restore review"}
                </button>
              </div>
            </article>
          ))}
          {reviews.data.items.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
              No reviews match these filters.
            </p>
          ) : null}
          {reviews.data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <button
                className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page <= 1}
                onClick={() => setFilter("page", String(page - 1))}
              >
                Previous
              </button>
              <p className="text-sm font-semibold text-slate-600">
                Page {page} of {reviews.data.pagination.totalPages}
              </p>
              <button
                className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page >= reviews.data.pagination.totalPages}
                onClick={() => setFilter("page", String(page + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {pending ? (
        <ManagementActionDialog
          title={`${pending.action === "HIDE" ? "Hide" : "Restore"} ${pending.label}?`}
          description="Confirm this moderation decision. The content visibility will change immediately and the reason will be retained in the audit history."
          confirmLabel={pending.action === "HIDE" ? "Hide content" : "Restore content"}
          tone={pending.action === "HIDE" ? "danger" : "default"}
          isPending={moderation.isPending}
          minimumReasonLength={10}
          error={moderation.isError ? getApiErrorMessage(moderation.error) : null}
          onCancel={() => setPending(null)}
          onConfirm={(reason) => void confirm(reason)}
        />
      ) : null}
    </section>
  );
}
