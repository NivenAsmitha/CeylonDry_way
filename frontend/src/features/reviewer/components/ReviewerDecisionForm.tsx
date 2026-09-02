import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { normalizeApiError } from "../../../types/api.types";
import { useReviewDecision } from "../hooks/useReviewerListings";
import { REVIEW_DECISION_LABELS } from "../reviewer.constants";
import {
  reasonRequiredDecisions,
  reviewDecisionFormSchema,
  type ReviewDecisionFormValues,
} from "../schemas/review-decision.schema";
import type { ReviewerListing } from "../types/reviewer.types";

interface ReviewerDecisionFormProps {
  listing: ReviewerListing;
}

export function ReviewerDecisionForm({ listing }: ReviewerDecisionFormProps) {
  const navigate = useNavigate();
  const mutation = useReviewDecision(listing.propertyId);
  const submissionInFlight = useRef<Promise<void> | null>(null);
  const [pendingDecision, setPendingDecision] =
    useState<ReviewDecisionFormValues | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ReviewDecisionFormValues>({
    resolver: zodResolver(reviewDecisionFormSchema),
    defaultValues: {
      decision: listing.allowedDecisions[0] ?? "APPROVE",
      reason: "",
    },
  });
  const selectedDecision = useWatch({ control, name: "decision" });
  const reasonRequired = reasonRequiredDecisions.has(selectedDecision);

  async function submit(values: ReviewDecisionFormValues): Promise<void> {
    if (submissionInFlight.current) {
      return submissionInFlight.current;
    }

    if (!listing.allowedDecisions.includes(values.decision)) {
      setError("decision", {
        type: "validate",
        message: "This decision is no longer available for the current status.",
      });
      setServerError(
        "The listing status changed. Review the available decision and try again.",
      );
      setPendingDecision(null);
      return;
    }

    if (!pendingDecision) {
      setPendingDecision(values);
      return;
    }

    const operation = (async () => {
      setServerError(null);

      try {
        await mutation.mutateAsync({
          decision: values.decision,
          reason: values.reason || null,
        });
        navigate("/reviewer", {
          replace: true,
          state: {
            decisionSuccess: `${REVIEW_DECISION_LABELS[values.decision]} was recorded successfully.`,
          },
        });
      } catch (error: unknown) {
        const normalized = normalizeApiError(error);
        const reasonError = normalized.details.find(
          (detail) => detail.field === "reason",
        );

        if (reasonError) {
          setError("reason", {
            type: "server",
            message: reasonError.message,
          });
        }
        setServerError(normalized.messages.join(" "));
        setPendingDecision(null);
      }
    })().finally(() => {
      submissionInFlight.current = null;
    });

    submissionInFlight.current = operation;
    await operation;
  }

  if (listing.allowedDecisions.length === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        No decision is available. You may own this listing, or its status may
        have changed.
      </div>
    );
  }

  return (
    <>
      <form
        className="space-y-5"
        noValidate
        onSubmit={(event) => void handleSubmit(submit)(event)}
      >
        {serverError ? (
          <ErrorMessage
            title="Decision could not be saved"
            message={serverError}
          />
        ) : null}

        <div>
          <label
            className="mb-2 block text-sm font-bold"
            htmlFor="review-decision"
          >
            Decision
          </label>
          <select
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            id="review-decision"
            {...register("decision", {
              onChange: () => {
                setPendingDecision(null);
              },
            })}
          >
            {listing.allowedDecisions.map((decision) => (
              <option key={decision} value={decision}>
                {REVIEW_DECISION_LABELS[decision]}
              </option>
            ))}
          </select>
          {errors.decision?.message ? (
            <p className="mt-2 text-sm font-semibold text-red-700" role="alert">
              {errors.decision.message}
            </p>
          ) : null}
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-bold"
            htmlFor="review-reason"
          >
            Reason {reasonRequired ? "(required)" : "(optional)"}
          </label>
          <textarea
            className={`min-h-32 w-full rounded-xl border bg-white px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 ${
              errors.reason
                ? "border-red-400 focus-visible:outline-red-700"
                : "border-slate-300 focus-visible:outline-brand-700"
            }`}
            id="review-reason"
            maxLength={1000}
            aria-invalid={Boolean(errors.reason)}
            aria-describedby={errors.reason ? "review-reason-error" : undefined}
            {...register("reason")}
          />
          <p className="mt-2 text-xs text-slate-500">
            Owners can see this reason. Do not include private reviewer notes or
            authentication information.
          </p>
          {errors.reason?.message ? (
            <p
              className="mt-2 text-sm font-semibold text-red-700"
              id="review-reason-error"
            >
              {errors.reason.message}
            </p>
          ) : null}
        </div>

        <button
          className="min-h-12 w-full rounded-xl bg-slate-950 px-5 font-extrabold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-wait disabled:opacity-50"
          type="submit"
          disabled={mutation.isPending}
        >
          {mutation.isPending
            ? "Recording decision..."
            : `Review ${REVIEW_DECISION_LABELS[selectedDecision]} decision`}
        </button>
      </form>

      {pendingDecision ? (
        <ConfirmationDialog
          title={`${REVIEW_DECISION_LABELS[pendingDecision.decision]} this listing?`}
          description="This decision changes the property workflow, notifies the owner and is retained in the audit history."
          confirmLabel={`Confirm ${REVIEW_DECISION_LABELS[pendingDecision.decision]}`}
          tone={
            pendingDecision.decision === "REJECT" ||
            pendingDecision.decision === "SUSPEND"
              ? "danger"
              : "default"
          }
          isPending={mutation.isPending}
          details={
            <div className="space-y-2">
              <p>
                <span className="font-bold text-slate-950">Property:</span>{" "}
                {listing.submittedVersion.name || "Untitled property"}
              </p>
              {pendingDecision.reason ? (
                <p className="whitespace-pre-wrap">
                  <span className="font-bold text-slate-950">Reason:</span>{" "}
                  {pendingDecision.reason}
                </p>
              ) : null}
            </div>
          }
          onCancel={() => setPendingDecision(null)}
          onConfirm={() => void submit(pendingDecision)}
        />
      ) : null}
    </>
  );
}
