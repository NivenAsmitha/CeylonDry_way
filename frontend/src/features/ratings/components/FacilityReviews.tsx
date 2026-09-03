import { useState } from "react";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useLanguage } from "../../../i18n/useLanguage";
import { getApiErrorMessage } from "../../../types/api.types";
import { useAuth } from "../../auth/hooks/useAuth";
import { useOwnerProperties } from "../../properties/hooks/useOwnerProperties";
import {
  useDeleteOwnerReply,
  useFacilityReviews,
  useSaveOwnerReply,
} from "../hooks/useRatings";

function overallScore(review: {
  cleanliness: number;
  safety: number;
  accessibility: number;
  accuracy: number;
}): string {
  return (
    (review.cleanliness +
      review.safety +
      review.accessibility +
      review.accuracy) /
    4
  ).toFixed(1);
}

export function FacilityReviews({ propertyId }: { propertyId: string }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [deleteReplyReviewId, setDeleteReplyReviewId] = useState<string | null>(
    null,
  );
  const reviews = useFacilityReviews(propertyId, page);
  const hasOwnerRole = user?.roles.includes("OWNER") ?? false;
  const ownerProperties = useOwnerProperties("owner", hasOwnerRole);
  const ownsProperty =
    hasOwnerRole &&
    (ownerProperties.data?.items.some((property) => property.id === propertyId) ??
      false);
  const saveReply = useSaveOwnerReply(propertyId);
  const deleteReply = useDeleteOwnerReply(propertyId);

  async function submitReply(reviewId: string): Promise<void> {
    if (replyText.trim().length < 10 || saveReply.isPending) return;
    try {
      await saveReply.mutateAsync({ reviewId, message: replyText.trim() });
      setEditingReviewId(null);
      setReplyText("");
    } catch {
      // The mutation error remains visible beside the reply form.
    }
  }

  async function confirmDeleteReply(): Promise<void> {
    if (!deleteReplyReviewId || deleteReply.isPending) return;
    try {
      await deleteReply.mutateAsync(deleteReplyReviewId);
      setDeleteReplyReviewId(null);
    } catch {
      // Keep the confirmation open so the owner can retry.
    }
  }

  return (
    <section className="mt-8 border-t border-slate-200 pt-7">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
            {t("Visitor feedback")}
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {t("Written reviews")}
          </h2>
        </div>
        {reviews.data ? (
          <p className="text-sm font-bold text-slate-500">
            {reviews.data.pagination.total} {t("reviews")}
          </p>
        ) : null}
      </div>

      {reviews.isPending ? (
        <div className="mt-5 h-48 animate-pulse rounded-2xl bg-slate-100" />
      ) : reviews.isError ? (
        <p className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
          {getApiErrorMessage(reviews.error)}
        </p>
      ) : reviews.data?.items.length ? (
        <div className="mt-5 space-y-4">
          {reviews.data.items.map((review) => (
            <article
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              key={review.id}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-black text-slate-950">
                    {review.author.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">
                    {review.visitDate
                      ? `${t("Visited")} ${new Date(`${review.visitDate}T00:00:00`).toLocaleDateString()}`
                      : new Date(review.updatedAt).toLocaleDateString()}
                    {review.createdAt !== review.updatedAt
                      ? ` · ${t("Edited")}`
                      : ""}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-black text-amber-700">
                  ★ {overallScore(review)} / 5
                </span>
              </div>
              <p className="mt-4 whitespace-pre-line leading-7 text-slate-700">
                {review.reviewText}
              </p>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold text-slate-500">
                <span>{t("Cleanliness")}: {review.cleanliness}/5</span>
                <span>{t("Safety")}: {review.safety}/5</span>
                <span>{t("Accessibility")}: {review.accessibility}/5</span>
                <span>{t("Accuracy")}: {review.accuracy}/5</span>
              </div>

              {review.reply ? (
                <div className="mt-5 rounded-2xl border-l-4 border-brand-500 bg-brand-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-brand-800">
                    {t("Response from the property owner")}
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                    {review.reply.message}
                  </p>
                  {ownsProperty ? (
                    <div className="mt-3 flex gap-3 text-sm font-bold">
                      <button
                        className="text-brand-800 underline"
                        type="button"
                        onClick={() => {
                          saveReply.reset();
                          setEditingReviewId(review.id);
                          setReplyText(review.reply?.message ?? "");
                        }}
                      >
                        {t("Edit reply")}
                      </button>
                      <button
                        className="text-red-700 underline"
                        type="button"
                        onClick={() => setDeleteReplyReviewId(review.id)}
                      >
                        {t("Delete reply")}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : ownsProperty ? (
                <button
                  className="mt-5 min-h-10 rounded-xl border border-brand-200 px-4 text-sm font-black text-brand-800 transition hover:bg-brand-50"
                  type="button"
                  onClick={() => {
                    saveReply.reset();
                    setEditingReviewId(review.id);
                    setReplyText("");
                  }}
                >
                  {t("Reply as property owner")}
                </button>
              ) : null}

              {editingReviewId === review.id ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="text-sm font-black text-slate-900">
                    {t("Public owner reply")}
                    <textarea
                      className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal"
                      maxLength={1000}
                      value={replyText}
                      onChange={(event) => setReplyText(event.target.value)}
                    />
                  </label>
                  {saveReply.isError ? (
                    <p className="mt-2 text-sm font-semibold text-red-700">
                      {getApiErrorMessage(saveReply.error)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex justify-end gap-3">
                    <button
                      className="min-h-10 rounded-xl px-4 text-sm font-bold text-slate-600"
                      type="button"
                      onClick={() => setEditingReviewId(null)}
                    >
                      {t("Cancel")}
                    </button>
                    <button
                      className="min-h-10 rounded-xl bg-brand-700 px-4 text-sm font-black text-white disabled:opacity-50"
                      type="button"
                      disabled={replyText.trim().length < 10 || saveReply.isPending}
                      onClick={() => void submitReply(review.id)}
                    >
                      {t(saveReply.isPending ? "Saving…" : "Publish reply")}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}

          {reviews.data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between">
              <button
                className="min-h-10 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                {t("Previous")}
              </button>
              <span className="text-sm font-bold text-slate-500">
                {page} / {reviews.data.pagination.totalPages}
              </span>
              <button
                className="min-h-10 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page >= reviews.data.pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
              >
                {t("Next")}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm text-slate-600">
          {t("No written reviews have been shared yet.")}
        </p>
      )}

      {deleteReplyReviewId ? (
        <ConfirmationDialog
          title={t("Delete your public reply?")}
          description={t("The reply will be removed from this review.")}
          confirmLabel={t("Delete reply")}
          tone="danger"
          isPending={deleteReply.isPending}
          onCancel={() => setDeleteReplyReviewId(null)}
          onConfirm={() => void confirmDeleteReply()}
        />
      ) : null}
    </section>
  );
}
