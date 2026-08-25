import type { ReviewDecisionType } from "./types/reviewer.types";

export const REVIEW_DECISION_LABELS: Readonly<
  Record<ReviewDecisionType, string>
> = {
  APPROVE: "Approve",
  REQUEST_CHANGES: "Request changes",
  REJECT: "Reject",
  SUSPEND: "Suspend",
  REACTIVATE: "Reactivate",
};
