import { useState, type FormEvent } from "react";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { useAuth } from "../auth/hooks/useAuth";
import {
  PROPERTY_REPORT_CATEGORIES,
  propertyReportCategoryLabels,
  type PropertyReportCategory,
} from "./reports.service";
import { useCreatePropertyReport } from "./useReports";
import { getApiErrorMessage } from "../../types/api.types";

export function ReportPlaceButton({ propertyId }: { propertyId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] =
    useState<PropertyReportCategory>("INCORRECT_DETAILS");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [confirmSubmission, setConfirmSubmission] = useState(false);
  const report = useCreatePropertyReport(propertyId);

  function close(): void {
    if (!report.isPending) setOpen(false);
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (description.trim().length < 20) return;
    setConfirmSubmission(true);
  }

  async function sendReport(): Promise<void> {
    try {
      await report.mutateAsync({
        category,
        description: description.trim(),
        ...(email.trim() ? { reporterEmail: email.trim() } : {}),
      });
    } catch {
      // The mutation exposes the error in the report form.
    } finally {
      setConfirmSubmission(false);
    }
  }

  return (
    <>
      <button
        className="min-h-11 text-left text-sm font-bold text-red-700 underline decoration-red-200 underline-offset-4 hover:text-red-800"
        type="button"
        onClick={() => {
          report.reset();
          setOpen(true);
        }}
      >
        Report a problem with this place
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-place-title"
          >
            {report.isSuccess ? (
              <div className="text-center">
                <span
                  className="mx-auto grid size-14 place-items-center rounded-full bg-brand-100 text-2xl text-brand-800"
                  aria-hidden="true"
                >
                  ✓
                </span>
                <h2
                  className="mt-4 text-2xl font-black text-slate-950"
                  id="report-place-title"
                >
                  Report received
                </h2>
                <p className="mt-3 text-slate-600">{report.data.message}</p>
                <button
                  className="mt-6 min-h-11 rounded-xl bg-slate-950 px-6 font-bold text-white"
                  type="button"
                  onClick={close}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={(event) => void submit(event)}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-red-700">
                      Community report
                    </p>
                    <h2
                      className="mt-2 text-2xl font-black text-slate-950"
                      id="report-place-title"
                    >
                      Tell us what is wrong
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      An administrator will review your report. Do not include
                      passwords or sensitive personal information.
                    </p>
                  </div>
                  <button
                    className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-200 text-xl"
                    type="button"
                    aria-label="Close report form"
                    onClick={close}
                  >
                    ×
                  </button>
                </div>

                {report.isError ? (
                  <div className="mt-5">
                    <ErrorMessage message={getApiErrorMessage(report.error)} />
                  </div>
                ) : null}

                <label
                  className="mt-6 block text-sm font-bold text-slate-900"
                  htmlFor="report-category"
                >
                  Problem type
                </label>
                <select
                  id="report-category"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as PropertyReportCategory)
                  }
                >
                  {PROPERTY_REPORT_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {propertyReportCategoryLabels[value]}
                    </option>
                  ))}
                </select>

                <label
                  className="mt-5 block text-sm font-bold text-slate-900"
                  htmlFor="report-description"
                >
                  What did you notice?
                </label>
                <textarea
                  id="report-description"
                  className="mt-2 min-h-36 w-full rounded-xl border border-slate-300 px-4 py-3"
                  maxLength={1500}
                  required
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the incorrect information or concern clearly."
                />
                <p className="mt-2 text-xs text-slate-500">
                  At least 20 characters. {description.length}/1500
                </p>

                <label
                  className="mt-5 block text-sm font-bold text-slate-900"
                  htmlFor="report-email"
                >
                  Email{" "}
                  <span className="font-normal text-slate-500">(optional)</span>
                </label>
                <input
                  id="report-email"
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4"
                  type="email"
                  maxLength={254}
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Only the moderation team can see this address.
                </p>

                <div className="mt-7 flex justify-end gap-3">
                  <button
                    className="min-h-11 rounded-xl border border-slate-300 px-5 font-bold"
                    type="button"
                    onClick={close}
                  >
                    Cancel
                  </button>
                  <button
                    className="min-h-11 rounded-xl bg-red-700 px-6 font-bold text-white disabled:opacity-50"
                    type="submit"
                    disabled={
                      description.trim().length < 20 || report.isPending
                    }
                  >
                    {report.isPending ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {confirmSubmission ? (
        <ConfirmationDialog
          title="Send this community report?"
          description="Your report will be sent to the ComfortGo moderation team for investigation."
          confirmLabel="Send report"
          tone="danger"
          isPending={report.isPending}
          details={
            <p>
              <span className="font-bold text-slate-950">Problem type:</span>{" "}
              {propertyReportCategoryLabels[category]}
            </p>
          }
          onCancel={() => setConfirmSubmission(false)}
          onConfirm={() => void sendReport()}
        />
      ) : null}
    </>
  );
}
