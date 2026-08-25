import { z } from "zod";
import {
  REVIEW_DECISIONS,
  type ReviewDecisionType,
} from "../types/reviewer.types";

export const reasonRequiredDecisions = new Set<ReviewDecisionType>([
  "REQUEST_CHANGES",
  "REJECT",
  "SUSPEND",
]);

export const reviewDecisionFormSchema = z
  .object({
    decision: z.enum(REVIEW_DECISIONS),
    reason: z.string().trim().max(1000, "Use 1000 characters or fewer."),
  })
  .superRefine((value, context) => {
    if (
      reasonRequiredDecisions.has(value.decision) &&
      value.reason.length < 10
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Enter a meaningful reason of at least 10 characters.",
      });
    }

    if (
      !reasonRequiredDecisions.has(value.decision) &&
      value.reason.length > 0 &&
      value.reason.length < 3
    ) {
      context.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Use at least 3 characters or leave the reason blank.",
      });
    }
  });

export type ReviewDecisionFormValues = z.infer<typeof reviewDecisionFormSchema>;
