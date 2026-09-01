import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import {
  PROPERTY_REPORT_CATEGORIES,
  PROPERTY_REPORT_STATUSES,
  propertyReportCategoryLabels,
  type PropertyReportStatus,
  type ReportModerationAction,
} from "../../features/reports/reports.service";
import {
  useAdminReports,
  useModeratePropertyReport,
} from "../../features/reports/useReports";
import { getApiErrorMessage } from "../../types/api.types";

const actionLabels: Record<ReportModerationAction, string> = {
  START_REVIEW: "Start review",
  RESOLVE: "Resolve report",
  DISMISS: "Dismiss report",
};

const statusStyles: Record<PropertyReportStatus, string> = {
  OPEN: "bg-red-100 text-red-800",
  IN_REVIEW: "bg-amber-100 text-amber-900",
  RESOLVED: "bg-green-100 text-green-800",
  DISMISSED: "bg-slate-200 text-slate-700",
};

export function AdminReportsPage() {
  const [params, setParams] = useSearchParams();
  const status = PROPERTY_REPORT_STATUSES.find(
    (value) => value === params.get("status"),
  );
  const category = PROPERTY_REPORT_CATEGORIES.find(
    (value) => value === params.get("category"),
  );
  const search = params.get("search") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const reports = useAdminReports({
    search: search || undefined,
    status,
    category,
    page,
  });
  const moderation = useModeratePropertyReport();
  const [pending, setPending] = useState<{
    id: string;
    placeName: string;
    action: ReportModerationAction;
  } | null>(null);
  const [note, setNote] = useState("");

  function updateParam(name: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    updateParam(
      "search",
      String(new FormData(event.currentTarget).get("search") ?? "").trim(),
    );
  }

  async function confirmModeration(): Promise<void> {
    if (!pending) return;
    if (pending.action !== "START_REVIEW" && note.trim().length < 10) return;
    await moderation.mutateAsync({
      reportId: pending.id,
      action: pending.action,
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setPending(null);
    setNote("");
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
            Admin workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Reports & moderation
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Review community concerns, investigate the linked property, and keep
            a complete audit trail of every decision.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 px-4 font-bold text-slate-800"
          to="/admin/properties"
        >
          Open property management
        </Link>
      </div>

      {reports.data ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {PROPERTY_REPORT_STATUSES.map((value) => (
            <button
              key={value}
              className={`rounded-2xl border p-5 text-left shadow-sm transition ${status === value ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white hover:border-slate-300"}`}
              type="button"
              onClick={() =>
                updateParam("status", status === value ? "" : value)
              }
            >
              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                {value.replaceAll("_", " ")}
              </span>
              <span className="mt-2 block text-3xl font-black text-slate-950">
                {reports.data.summary[value]}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          className="grid gap-3 lg:grid-cols-[1fr_15rem_12rem_auto]"
          onSubmit={submitSearch}
        >
          <input
            className="min-h-12 rounded-xl border border-slate-300 px-4"
            name="search"
            defaultValue={search}
            placeholder="Search place, owner, or report details"
            aria-label="Search reports"
          />
          <select
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
            value={category ?? ""}
            aria-label="Filter by category"
            onChange={(event) => updateParam("category", event.target.value)}
          >
            <option value="">All report types</option>
            {PROPERTY_REPORT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {propertyReportCategoryLabels[value]}
              </option>
            ))}
          </select>
          <select
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
            value={status ?? ""}
            aria-label="Filter by status"
            onChange={(event) => updateParam("status", event.target.value)}
          >
            <option value="">All statuses</option>
            {PROPERTY_REPORT_STATUSES.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button
            className="min-h-12 rounded-xl bg-slate-950 px-6 font-bold text-white"
            type="submit"
          >
            Search
          </button>
        </form>
      </div>

      {reports.isPending ? <LoadingScreen message="Loading reports…" /> : null}
      {reports.isError ? (
        <div className="mt-8">
          <ErrorMessage
            title="Reports could not be loaded"
            message={getApiErrorMessage(reports.error)}
          />
        </div>
      ) : null}

      {reports.data ? (
        <div className="mt-6 space-y-4">
          {reports.data.items.map((report) => (
            <article
              key={report.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[report.status]}`}
                    >
                      {report.status.replaceAll("_", " ")}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                      {propertyReportCategoryLabels[report.category]}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-950">
                    {report.propertyVersion.name || "Untitled property"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {[
                      report.propertyVersion.city,
                      report.propertyVersion.district,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Location not provided"}{" "}
                    · Reported {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
                <Link
                  className="inline-flex min-h-11 items-center font-bold text-brand-800"
                  to={`/places/${report.property.id}`}
                >
                  View public listing →
                </Link>
              </div>
              <p className="mt-5 whitespace-pre-line rounded-xl bg-slate-50 p-4 leading-7 text-slate-700">
                {report.description}
              </p>
              <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="font-bold text-slate-500">Owner</dt>
                  <dd className="mt-1 font-semibold text-slate-900">
                    {report.property.owner.name}
                    <br />
                    <span className="font-normal text-slate-600">
                      {report.property.owner.email}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">Reporter contact</dt>
                  <dd className="mt-1 text-slate-700">
                    {report.reporterEmail || "Not provided"}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">Property status</dt>
                  <dd className="mt-1 text-slate-700">
                    {report.property.lifecycleStatus.replaceAll("_", " ")}
                  </dd>
                </div>
                <div>
                  <dt className="font-bold text-slate-500">Handled by</dt>
                  <dd className="mt-1 text-slate-700">
                    {report.moderator?.name || "Unassigned"}
                  </dd>
                </div>
              </dl>
              {report.moderatorNote ? (
                <p className="mt-5 border-l-4 border-brand-500 pl-4 text-sm leading-6 text-slate-700">
                  <strong>Moderator note:</strong> {report.moderatorNote}
                </p>
              ) : null}
              {report.allowedActions.length ? (
                <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
                  {report.allowedActions.map((action) => (
                    <button
                      key={action}
                      className={`min-h-10 rounded-xl border px-4 text-sm font-bold ${action === "DISMISS" ? "border-red-200 text-red-700" : action === "RESOLVE" ? "border-brand-200 text-brand-800" : "border-slate-300 text-slate-700"}`}
                      type="button"
                      onClick={() => {
                        moderation.reset();
                        setPending({
                          id: report.id,
                          placeName:
                            report.propertyVersion.name || "Untitled property",
                          action,
                        });
                        setNote("");
                      }}
                    >
                      {actionLabels[action]}
                    </button>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
          {reports.data.items.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
              No reports match these filters.
            </p>
          ) : null}
          {reports.data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <button
                className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page <= 1}
                onClick={() => updateParam("page", String(page - 1))}
              >
                Previous
              </button>
              <p className="text-sm font-semibold text-slate-600">
                Page {page} of {reports.data.pagination.totalPages}
              </p>
              <button
                className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page >= reports.data.pagination.totalPages}
                onClick={() => updateParam("page", String(page + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {pending ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !moderation.isPending)
              setPending(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-action-title"
          >
            <h2 className="text-xl font-black" id="report-action-title">
              {actionLabels[pending.action]}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {pending.placeName}. This decision and your note are saved in the
              audit history.
            </p>
            {moderation.isError ? (
              <div className="mt-5">
                <ErrorMessage message={getApiErrorMessage(moderation.error)} />
              </div>
            ) : null}
            <label
              className="mt-5 block text-sm font-bold"
              htmlFor="report-action-note"
            >
              Moderator note{" "}
              {pending.action === "START_REVIEW" ? "(optional)" : ""}
            </label>
            <textarea
              id="report-action-note"
              className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3"
              maxLength={1500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                pending.action === "START_REVIEW"
                  ? "Add an initial investigation note if needed."
                  : "Explain what was verified and why this report is being closed."
              }
            />
            {pending.action !== "START_REVIEW" ? (
              <p className="mt-2 text-xs text-slate-500">
                Enter at least 10 characters.
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold"
                type="button"
                onClick={() => setPending(null)}
              >
                Cancel
              </button>
              <button
                className="min-h-11 rounded-xl bg-slate-950 px-5 font-bold text-white disabled:opacity-50"
                type="button"
                disabled={
                  moderation.isPending ||
                  (pending.action !== "START_REVIEW" && note.trim().length < 10)
                }
                onClick={() => void confirmModeration()}
              >
                {moderation.isPending ? "Saving…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
