import { type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import {
  SUPPORT_STATUSES,
  supportCategoryLabels,
  type SupportStatus,
} from "../../features/support/support.service";
import { useStaffSupportTickets } from "../../features/support/useSupport";
import { getApiErrorMessage } from "../../types/api.types";

const statusStyle: Record<SupportStatus, string> = {
  OPEN: "bg-amber-50 text-amber-800",
  ASSIGNED: "bg-blue-50 text-blue-800",
  WAITING_FOR_CLIENT: "bg-violet-50 text-violet-800",
  WAITING_FOR_STAFF: "bg-orange-50 text-orange-800",
  ESCALATED: "bg-red-50 text-red-800",
  RESOLVED: "bg-emerald-50 text-emerald-800",
  CLOSED: "bg-slate-100 text-slate-700",
};

export function StaffSupportPage() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") ?? "";
  const statusValue = params.get("status");
  const status = SUPPORT_STATUSES.includes(statusValue as SupportStatus)
    ? (statusValue as SupportStatus)
    : undefined;
  const page = Math.max(1, Number(params.get("page") ?? "1") || 1);
  const tickets = useStaffSupportTickets({
    search: search || undefined,
    status,
    page,
  });

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

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
        Client care
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
        Support inbox
      </h1>
      <p className="mt-3 max-w-3xl leading-7 text-slate-600">
        Respond privately to client questions, claim unassigned requests, and
        escalate or resolve cases with a complete audit history.
      </p>

      <form
        className="mt-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_15rem_auto]"
        onSubmit={submitSearch}
      >
        <input
          className="min-h-12 rounded-xl border border-slate-300 px-4"
          name="search"
          defaultValue={search}
          placeholder="Search subject, client name, or email"
          aria-label="Search support tickets"
        />
        <select
          className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
          value={status ?? ""}
          onChange={(event) => setFilter("status", event.target.value)}
          aria-label="Support request status"
        >
          <option value="">All statuses</option>
          {SUPPORT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button
          className="min-h-12 rounded-xl bg-slate-950 px-6 font-black text-white"
          type="submit"
        >
          Search
        </button>
      </form>

      {tickets.isPending ? <LoadingScreen message="Loading support inbox…" /> : null}
      {tickets.isError ? (
        <div className="mt-8">
          <ErrorMessage message={getApiErrorMessage(tickets.error)} />
        </div>
      ) : null}
      {tickets.data ? (
        <div className="mt-6 space-y-4">
          {tickets.data.items.map((ticket) => (
            <Link
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md sm:p-6"
              key={ticket.id}
              to={`/staff/support/${ticket.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyle[ticket.status]}`}>
                      {ticket.status.replaceAll("_", " ")}
                    </span>
                    {ticket.priority === "URGENT" ? (
                      <span className="rounded-full bg-red-700 px-3 py-1 text-xs font-black text-white">
                        URGENT
                      </span>
                    ) : null}
                    <span className="text-xs font-black text-brand-700">
                      CG-{ticket.ticketNumber.toString().padStart(6, "0")}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-950">
                    {ticket.subject}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {ticket.createdBy.name} · {ticket.createdBy.email}
                  </p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{supportCategoryLabels[ticket.category]}</p>
                  <p className="mt-1 font-bold text-slate-700">
                    {ticket.assignedReviewer?.name ?? "Unassigned"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-500">
                {ticket._count.messages} messages · Updated{" "}
                {new Date(ticket.updatedAt).toLocaleString()}
              </p>
            </Link>
          ))}
          {tickets.data.items.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
              No support requests match these filters.
            </p>
          ) : null}
          {tickets.data.pagination.totalPages > 1 ? (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <button
                className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page <= 1}
                onClick={() => setFilter("page", String(page - 1))}
              >
                Previous
              </button>
              <span className="text-sm font-bold text-slate-500">
                Page {page} of {tickets.data.pagination.totalPages}
              </span>
              <button
                className="min-h-10 rounded-lg border border-slate-300 px-4 font-bold disabled:opacity-40"
                type="button"
                disabled={page >= tickets.data.pagination.totalPages}
                onClick={() => setFilter("page", String(page + 1))}
              >
                Next
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
