import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import {
  useAuditLogs,
  useDeveloperHealth,
} from "../../features/developer-operations/useDeveloperOperations";
import { getApiErrorMessage } from "../../types/api.types";

function duration(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return [days ? `${days}d` : "", hours ? `${hours}h` : "", `${minutes}m`]
    .filter(Boolean)
    .join(" ");
}

function jsonSummary(value: unknown): string {
  return JSON.stringify(value, null, 2) || "No data";
}

export function DeveloperOperationsPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const action = params.get("action") ?? "";
  const targetType = params.get("targetType") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const health = useDeveloperHealth();
  const audit = useAuditLogs({
    search: search || undefined,
    action: action || undefined,
    targetType: targetType || undefined,
    page,
  });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  function updateParam(name: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    if (name !== "page") next.delete("page");
    setParams(next);
  }

  function submitFilters(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams(params);
    for (const name of ["search", "action", "targetType"] as const) {
      const value = String(form.get(name) ?? "").trim();
      if (value) next.set(name, value);
      else next.delete(name);
    }
    next.delete("page");
    setParams(next);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-700">
            Developer workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            System operations
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Monitor service health and inspect privileged activity without
            exposing application secrets or direct database controls.
          </p>
        </div>
        <button
          className="min-h-11 rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-800"
          type="button"
          disabled={health.isFetching}
          onClick={() => void health.refetch()}
        >
          {health.isFetching ? "Refreshing…" : "Refresh health"}
        </button>
      </div>

      {health.isPending ? (
        <LoadingScreen message="Checking system health…" />
      ) : null}
      {health.isError ? (
        <div className="mt-8">
          <ErrorMessage
            title="Health data is unavailable"
            message={getApiErrorMessage(health.error)}
          />
        </div>
      ) : null}
      {health.data ? (
        <>
          <div className="mt-8 rounded-3xl border border-brand-200 bg-brand-50 p-6 shadow-sm">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <span
                  className="size-3 rounded-full bg-brand-500 shadow-[0_0_0_6px_rgba(16,185,129,0.15)]"
                  aria-hidden="true"
                />
                <div>
                  <h2 className="text-xl font-black text-brand-950">
                    All monitored services are operational
                  </h2>
                  <p className="mt-1 text-sm text-brand-800">
                    Last checked{" "}
                    {new Date(health.data.checkedAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="rounded-xl bg-white/80 px-4 py-3 text-sm font-bold text-brand-900">
                Database {health.data.database.latencyMs} ms
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Active users
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {health.data.metrics.users.active}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                of {health.data.metrics.users.total} accounts
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Active sessions
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {health.data.metrics.activeSessions}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                unexpired and not revoked
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Open reports
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {health.data.metrics.reports.byStatus.OPEN +
                  health.data.metrics.reports.byStatus.IN_REVIEW}
              </p>
              <p className="mt-1 text-sm text-slate-500">awaiting moderation</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                Audit events · 24h
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {health.data.metrics.auditEventsLast24Hours}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Uptime {duration(health.data.uptimeSeconds)}
              </p>
            </div>
          </div>
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-black text-slate-950">Property lifecycle</h2>
              <p className="text-sm text-slate-500">
                {health.data.metrics.properties.total} total properties · Node{" "}
                {health.data.runtime.node}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(health.data.metrics.properties.byStatus)
                .filter(([, count]) => count > 0)
                .map(([status, count]) => (
                  <span
                    key={status}
                    className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700"
                  >
                    {status.replaceAll("_", " ")} · {count}
                  </span>
                ))}
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-10 border-t border-slate-200 pt-10">
        <h2 className="text-2xl font-black text-slate-950">Audit history</h2>
        <p className="mt-2 text-slate-600">
          Search sensitive account, property, review, and moderation actions.
        </p>
        <form
          className="mt-6 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_13rem_13rem_auto]"
          onSubmit={submitFilters}
        >
          <input
            className="min-h-12 rounded-xl border border-slate-300 px-4"
            name="search"
            defaultValue={search}
            placeholder="Actor, action, or target ID"
            aria-label="Search audit history"
          />
          <input
            className="min-h-12 rounded-xl border border-slate-300 px-4"
            name="action"
            defaultValue={action}
            placeholder="Action contains"
            aria-label="Filter audit action"
          />
          <input
            className="min-h-12 rounded-xl border border-slate-300 px-4"
            name="targetType"
            defaultValue={targetType}
            placeholder="Target type"
            aria-label="Filter target type"
          />
          <button
            className="min-h-12 rounded-xl bg-slate-950 px-6 font-bold text-white"
            type="submit"
          >
            Filter
          </button>
        </form>

        {audit.isPending ? (
          <LoadingScreen message="Loading audit history…" />
        ) : null}
        {audit.isError ? (
          <div className="mt-6">
            <ErrorMessage
              title="Audit history is unavailable"
              message={getApiErrorMessage(audit.error)}
            />
          </div>
        ) : null}
        {audit.data ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Time</th>
                    <th className="px-5 py-4">Actor</th>
                    <th className="px-5 py-4">Action</th>
                    <th className="px-5 py-4">Target</th>
                    <th className="px-5 py-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {audit.data.items.map((item) => (
                    <tr key={item.id} className="align-top">
                      <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                        {new Date(item.createdAt).toLocaleString()}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">
                          {item.actor.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.actor.email}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-800">
                        {item.action.replaceAll("_", " ")}
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold">{item.targetType}</p>
                        <p
                          className="mt-1 max-w-48 truncate font-mono text-xs text-slate-500"
                          title={item.targetId}
                        >
                          {item.targetId}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          className="min-h-10 rounded-lg border border-slate-300 px-3 text-xs font-bold"
                          type="button"
                          onClick={() =>
                            setExpandedId(
                              expandedId === item.id ? null : item.id,
                            )
                          }
                        >
                          {expandedId === item.id ? "Hide" : "Inspect"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {audit.data.items.map((item) =>
              expandedId === item.id ? (
                <div
                  key={`${item.id}-details`}
                  className="border-t border-slate-200 bg-slate-950 p-5 text-slate-100"
                >
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Change summary
                  </p>
                  <div className="mt-3 grid gap-4 lg:grid-cols-2">
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-xs">
                      <strong>Before</strong>
                      {"\n"}
                      {jsonSummary(item.beforeSummary)}
                    </pre>
                    <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-white/5 p-4 text-xs">
                      <strong>After</strong>
                      {"\n"}
                      {jsonSummary(item.afterSummary)}
                    </pre>
                  </div>
                </div>
              ) : null,
            )}
            {audit.data.items.length === 0 ? (
              <p className="p-10 text-center text-slate-600">
                No audit events match these filters.
              </p>
            ) : null}
            {audit.data.pagination.totalPages > 1 ? (
              <div className="flex items-center justify-between border-t border-slate-200 p-4">
                <button
                  className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateParam("page", String(page - 1))}
                >
                  Previous
                </button>
                <p className="text-sm font-semibold text-slate-600">
                  Page {page} of {audit.data.pagination.totalPages}
                </p>
                <button
                  className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                  type="button"
                  disabled={page >= audit.data.pagination.totalPages}
                  onClick={() => updateParam("page", String(page + 1))}
                >
                  Next
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
