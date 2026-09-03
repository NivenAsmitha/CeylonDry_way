import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import {
  useDeleteRating,
  useMyRating,
  useRatingSummary,
  useSaveRating,
} from "../hooks/useRatings";
import type { FacilityRatingScores } from "../types/rating.types";
import { getApiErrorMessage } from "../../../types/api.types";
import { useLanguage } from "../../../i18n/useLanguage";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { useOwnerProperties } from "../../properties/hooks/useOwnerProperties";

type RatingCategory = keyof FacilityRatingScores;

const categories: Array<{
  key: RatingCategory;
  label: string;
  description: string;
}> = [
  {
    key: "cleanliness",
    label: "Cleanliness",
    description: "Condition and hygiene during your visit",
  },
  {
    key: "safety",
    label: "Safety",
    description: "How safe and comfortable the facility felt",
  },
  {
    key: "accessibility",
    label: "Accessibility",
    description: "Ease of access for different mobility needs",
  },
  {
    key: "accuracy",
    label: "Information accuracy",
    description: "How closely the listing matched the facility",
  },
];

const emptyScores: FacilityRatingScores = {
  cleanliness: 0,
  safety: 0,
  accessibility: 0,
  accuracy: 0,
};

function StarInput({
  category,
  value,
  onChange,
  outOfFiveLabel,
}: {
  category: string;
  value: number;
  onChange: (score: number) => void;
  outOfFiveLabel: string;
}) {
  return (
    <div className="flex gap-1" role="group" aria-label={`${category} rating`}>
      {[1, 2, 3, 4, 5].map((score) => (
        <button
          className={`grid size-10 place-items-center rounded-lg text-2xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
            score <= value
              ? "bg-amber-50 text-amber-500"
              : "bg-slate-100 text-slate-300 hover:text-amber-400"
          }`}
          type="button"
          key={score}
          aria-label={`${score} ${outOfFiveLabel}`}
          aria-pressed={score === value}
          onClick={() => onChange(score)}
        >
          <span aria-hidden="true">★</span>
        </button>
      ))}
    </div>
  );
}

export function FacilityRatings({ propertyId }: { propertyId: string }) {
  const { t } = useLanguage();
  const { user, isAuthenticated } = useAuth();
  const hasOwnerRole = user?.roles.includes("OWNER") ?? false;
  const ownerProperties = useOwnerProperties(
    "owner",
    isAuthenticated && hasOwnerRole,
  );
  const ownsProperty =
    hasOwnerRole &&
    (ownerProperties.data?.items.some((property) => property.id === propertyId) ??
      false);
  const canRate =
    isAuthenticated &&
    (!hasOwnerRole || !ownerProperties.isPending) &&
    !ownsProperty &&
    Boolean(user?.roles.some((role) => role === "CLIENT" || role === "OWNER"));
  const summaryQuery = useRatingSummary(propertyId);
  const myRatingQuery = useMyRating(propertyId, canRate);
  const saveRating = useSaveRating(propertyId);
  const deleteRating = useDeleteRating(propertyId);
  const [draftScores, setDraftScores] = useState<FacilityRatingScores | null>(
    null,
  );
  const [draftReviewText, setDraftReviewText] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const scores =
    draftScores ??
    (myRatingQuery.data
      ? {
          cleanliness: myRatingQuery.data.cleanliness,
          safety: myRatingQuery.data.safety,
          accessibility: myRatingQuery.data.accessibility,
          accuracy: myRatingQuery.data.accuracy,
        }
      : emptyScores);
  const reviewText = draftReviewText ?? myRatingQuery.data?.reviewText ?? "";

  const complete = Object.values(scores).every((score) => score >= 1);
  const busy = saveRating.isPending || deleteRating.isPending;

  async function submitRating(): Promise<void> {
    if (!complete || busy) return;
    setSaved(false);
    await saveRating.mutateAsync({
      ...scores,
      reviewText: reviewText.trim() || null,
    });
    setSaved(true);
  }

  async function removeRating(): Promise<void> {
    if (busy) return;
    setSaved(false);
    try {
      await deleteRating.mutateAsync();
      setDraftScores(null);
      setDraftReviewText(null);
      setConfirmRemoval(false);
    } catch {
      setConfirmRemoval(false);
    }
  }

  return (
    <section
      className="mt-8 border-t border-slate-200 pt-7"
      aria-labelledby="facility-ratings-title"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
            {t("Community experience")}
          </p>
          <h2
            className="mt-2 text-2xl font-black text-slate-950"
            id="facility-ratings-title"
          >
            {t("Facility ratings")}
          </h2>
        </div>
        {summaryQuery.data?.overall !== null &&
        summaryQuery.data?.overall !== undefined ? (
          <div className="text-right">
            <p className="text-3xl font-black text-slate-950">
              {summaryQuery.data.overall.toFixed(1)}
              <span className="text-base text-slate-400"> / 5</span>
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {summaryQuery.data.count}{" "}
              {t(summaryQuery.data.count === 1 ? "rating" : "ratings")}
            </p>
          </div>
        ) : null}
      </div>

      {summaryQuery.isPending ? (
        <div className="mt-5 h-36 animate-pulse rounded-2xl bg-slate-100" />
      ) : summaryQuery.data && summaryQuery.data.count > 0 ? (
        <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
          {categories.map((category) => {
            const score = summaryQuery.data[category.key];
            return (
              <div key={category.key}>
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-bold text-slate-800">
                    {t(category.label)}
                  </span>
                  <span className="font-black text-brand-800">
                    {score?.toFixed(1)} / 5
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-700"
                    style={{ width: `${((score ?? 0) / 5) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-brand-50 p-5 text-sm leading-6 text-brand-900">
          {t(
            "No ratings yet. Be the first visitor to share a useful facility rating.",
          )}
        </p>
      )}

      {canRate ? (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h3 className="text-lg font-black text-slate-950">
            {t(
              myRatingQuery.data ? "Update your rating" : "Rate this facility",
            )}
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            {t(
              "Select one score for every category and optionally share a written review.",
            )}
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {categories.map((category) => (
              <div key={category.key}>
                <p className="font-bold text-slate-900">{t(category.label)}</p>
                <p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">
                  {t(category.description)}
                </p>
                <div className="mt-2">
                  <StarInput
                    category={t(category.label)}
                    value={scores[category.key]}
                    outOfFiveLabel={t("out of 5")}
                    onChange={(score) => {
                      setSaved(false);
                      setDraftScores((current) => ({
                        ...(current ?? scores),
                        [category.key]: score,
                      }));
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <label className="text-sm font-black text-slate-900">
              {t("Written review (optional)")}
              <textarea
                className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal leading-6"
                maxLength={1000}
                value={reviewText}
                placeholder={t(
                  "Describe cleanliness, accessibility, safety, or whether the listing matched your visit.",
                )}
                onChange={(event) => {
                  setSaved(false);
                  setDraftReviewText(event.target.value);
                }}
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                {reviewText.length > 0 && reviewText.trim().length < 10
                  ? t("Write at least 10 characters or leave this blank.")
                  : `${reviewText.length}/1000`}
              </span>
            </label>
          </div>

          {saveRating.isError || deleteRating.isError ? (
            <p className="mt-5 text-sm font-semibold text-red-700" role="alert">
              {getApiErrorMessage(saveRating.error ?? deleteRating.error)}
            </p>
          ) : null}
          {saved ? (
            <p
              className="mt-5 text-sm font-semibold text-brand-800"
              role="status"
            >
              {t(
                "Your rating was saved. Thank you for helping other travellers.",
              )}
            </p>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="min-h-11 rounded-xl bg-brand-700 px-5 text-sm font-black text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={
                !complete ||
                busy ||
                myRatingQuery.isPending ||
                (reviewText.trim().length > 0 && reviewText.trim().length < 10)
              }
              onClick={() => void submitRating()}
            >
              {t(saveRating.isPending ? "Saving…" : "Save rating")}
            </button>
            {myRatingQuery.data ? (
              <button
                className="min-h-11 rounded-xl px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                type="button"
                disabled={busy}
                onClick={() => setConfirmRemoval(true)}
              >
                {t("Remove my rating")}
              </button>
            ) : null}
          </div>
        </div>
      ) : ownsProperty ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
          {t("Property owners cannot review their own facilities.")}
        </p>
      ) : !isAuthenticated ? (
        <p className="mt-6 text-sm text-slate-600">
          <Link
            className="font-black text-brand-800 underline"
            to="/login"
            state={{ from: `/places/${propertyId}` }}
          >
            {t("Sign in")}
          </Link>{" "}
          {t("with a client account to rate this facility.")}
        </p>
      ) : null}

      {confirmRemoval ? (
        <ConfirmationDialog
          title={t("Remove your facility rating?")}
          description={t(
            "Your cleanliness, safety, accessibility and accuracy scores will be removed from the public rating summary.",
          )}
          confirmLabel={t("Remove rating")}
          tone="danger"
          isPending={deleteRating.isPending}
          onCancel={() => setConfirmRemoval(false)}
          onConfirm={() => void removeRating()}
        />
      ) : null}
    </section>
  );
}
