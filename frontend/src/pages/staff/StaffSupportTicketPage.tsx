import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { supportCategoryLabels, type SupportStatus } from "../../features/support/support.service";
import {
  useAddStaffSupportMessage,
  useClaimSupportTicket,
  useStaffSupportTicket,
  useUpdateSupportTicketStatus,
} from "../../features/support/useSupport";
import { ManagementActionDialog } from "../../features/user-management/components/ManagementActionDialog";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { getApiErrorMessage } from "../../types/api.types";

const statusActions: Array<{ status: SupportStatus; label: string; tone?: "danger" }> = [
  { status: "ESCALATED", label: "Escalate" },
  { status: "RESOLVED", label: "Mark resolved" },
  { status: "CLOSED", label: "Close request", tone: "danger" },
];

export function StaffSupportTicketPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const ticket = useStaffSupportTicket(id);
  const claim = useClaimSupportTicket(id ?? "");
  const addMessage = useAddStaffSupportMessage(id ?? "");
  const updateStatus = useUpdateSupportTicketStatus(id ?? "");
  const [message, setMessage] = useState("");
  const [pendingStatus, setPendingStatus] = useState<SupportStatus | null>(null);

  async function send(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (message.trim().length < 2) return;
    try {
      await addMessage.mutateAsync(message.trim());
      setMessage("");
    } catch {
      // Keep the staff reply draft available for retry.
    }
  }

  async function confirmStatus(reason: string): Promise<void> {
    if (!pendingStatus) return;
    try {
      await updateStatus.mutateAsync({ status: pendingStatus, reason });
      setPendingStatus(null);
    } catch {
      // The confirmation dialog displays the status error.
    }
  }

  if (ticket.isPending) return <LoadingScreen message="Loading support request…" />;
  if (ticket.isError || !ticket.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorMessage message={getApiErrorMessage(ticket.error)} />
      </div>
    );
  }
  const item = ticket.data;
  const closed = item.status === "CLOSED";

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link className="font-black text-brand-800" to="/staff/support">
        ← Support inbox
      </Link>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-brand-700">
              CG-{item.ticketNumber.toString().padStart(6, "0")} · {supportCategoryLabels[item.category]}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">{item.subject}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {item.createdBy.name} · {item.createdBy.email}
            </p>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
              {item.status.replaceAll("_", " ")}
            </span>
            <p className="mt-3 text-sm font-bold text-slate-600">
              {item.assignedReviewer?.name ?? "Unassigned"}
            </p>
          </div>
        </div>

        {!closed ? (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-5">
            {item.assignedReviewer?.id !== user?.id ? (
              <button
                className="min-h-10 rounded-xl bg-brand-700 px-4 text-sm font-black text-white disabled:opacity-50"
                type="button"
                disabled={claim.isPending}
                onClick={() => void claim.mutateAsync().catch(() => undefined)}
              >
                {claim.isPending ? "Claiming…" : item.assignedReviewer ? "Assign to me" : "Claim request"}
              </button>
            ) : null}
            {statusActions
              .filter((action) => action.status !== item.status)
              .map((action) => (
                <button
                  className={`min-h-10 rounded-xl border px-4 text-sm font-black ${action.tone === "danger" ? "border-red-200 text-red-700" : "border-slate-300 text-slate-700"}`}
                  key={action.status}
                  type="button"
                  onClick={() => {
                    updateStatus.reset();
                    setPendingStatus(action.status);
                  }}
                >
                  {action.label}
                </button>
              ))}
          </div>
        ) : null}
        {claim.isError ? (
          <p className="mt-3 text-sm font-semibold text-red-700">{getApiErrorMessage(claim.error)}</p>
        ) : null}

        <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
          {item.messages.map((entry) => {
            const staff = entry.author.roles.some(({ role }) =>
              ["REVIEWER", "ADMIN"].includes(role.name),
            );
            return (
              <article
                className={`max-w-[88%] rounded-2xl p-4 ${staff ? "ml-auto bg-slate-900 text-white" : "bg-brand-50"}`}
                key={entry.id}
              >
                <p className={`text-xs font-black ${staff ? "text-slate-300" : "text-brand-800"}`}>
                  {entry.author.name} · {staff ? "Staff" : "Client"}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6">{entry.message}</p>
                <p className={`mt-2 text-xs ${staff ? "text-slate-300" : "text-slate-500"}`}>
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </article>
            );
          })}
        </div>

        {!closed ? (
          <form className="mt-8 border-t border-slate-200 pt-6" onSubmit={(event) => void send(event)}>
            <label className="text-sm font-black text-slate-900">
              Reply to client
              <textarea
                className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal"
                value={message}
                minLength={2}
                maxLength={2000}
                required
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
            {addMessage.isError ? (
              <p className="mt-3 text-sm font-semibold text-red-700">{getApiErrorMessage(addMessage.error)}</p>
            ) : null}
            <div className="mt-4 flex justify-end">
              <button
                className="min-h-11 rounded-xl bg-brand-700 px-6 font-black text-white disabled:opacity-50"
                type="submit"
                disabled={message.trim().length < 2 || addMessage.isPending}
              >
                {addMessage.isPending ? "Sending…" : "Send reply"}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {pendingStatus ? (
        <ManagementActionDialog
          title={`${pendingStatus.replaceAll("_", " ").toLowerCase()} this support request?`}
          description="Confirm the status change and record why this action is appropriate. The client will be able to see the updated status."
          confirmLabel="Confirm status"
          tone={pendingStatus === "CLOSED" ? "danger" : "default"}
          isPending={updateStatus.isPending}
          minimumReasonLength={10}
          error={updateStatus.isError ? getApiErrorMessage(updateStatus.error) : null}
          onCancel={() => setPendingStatus(null)}
          onConfirm={(reason) => void confirmStatus(reason)}
        />
      ) : null}
    </section>
  );
}
