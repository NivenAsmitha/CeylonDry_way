import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { supportCategoryLabels } from "../../features/support/support.service";
import {
  useAddMySupportMessage,
  useCloseMySupportTicket,
  useMySupportTicket,
} from "../../features/support/useSupport";
import { useLanguage } from "../../i18n/useLanguage";
import { getApiErrorMessage } from "../../types/api.types";

export function SupportTicketPage() {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const ticket = useMySupportTicket(id);
  const addMessage = useAddMySupportMessage(id ?? "");
  const closeTicket = useCloseMySupportTicket(id ?? "");
  const [message, setMessage] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  async function send(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (message.trim().length < 2) return;
    try {
      await addMessage.mutateAsync(message.trim());
      setMessage("");
    } catch {
      // Keep the draft so the client can retry.
    }
  }

  if (ticket.isPending) return <LoadingScreen message="Loading conversation…" />;
  if (ticket.isError || !ticket.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <ErrorMessage
          title="Support request could not be loaded"
          message={getApiErrorMessage(ticket.error)}
        />
      </div>
    );
  }
  const item = ticket.data;
  const closed = item.status === "CLOSED";

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <Link className="font-black text-brand-800" to="/support">
        ← {t("My support requests")}
      </Link>
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-brand-700">
              CG-{item.ticketNumber.toString().padStart(6, "0")} ·{" "}
              {t(supportCategoryLabels[item.category])}
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              {item.subject}
            </h1>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700">
            {item.status.replaceAll("_", " ")}
          </span>
        </div>
        <p className="mt-4 text-sm text-slate-500">
          {item.assignedReviewer
            ? `${t("Assigned to")} ${item.assignedReviewer.name}`
            : t("Waiting for a reviewer")}
        </p>

        <div className="mt-8 space-y-4 border-t border-slate-200 pt-6">
          {item.messages.map((entry) => {
            const staff = entry.author.roles.some(({ role }) =>
              ["REVIEWER", "ADMIN"].includes(role.name),
            );
            return (
              <article
                className={`max-w-[88%] rounded-2xl p-4 ${staff ? "bg-brand-50" : "ml-auto bg-slate-900 text-white"}`}
                key={entry.id}
              >
                <p className={`text-xs font-black ${staff ? "text-brand-800" : "text-slate-300"}`}>
                  {staff ? `${entry.author.name} · ${t("ComfortGo support")}` : t("You")}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6">
                  {entry.message}
                </p>
                <p className={`mt-2 text-xs ${staff ? "text-slate-500" : "text-slate-300"}`}>
                  {new Date(entry.createdAt).toLocaleString()}
                </p>
              </article>
            );
          })}
        </div>

        {!closed ? (
          <form className="mt-8 border-t border-slate-200 pt-6" onSubmit={(event) => void send(event)}>
            <label className="text-sm font-black text-slate-900">
              {t("Reply")}
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
              <p className="mt-3 text-sm font-semibold text-red-700">
                {getApiErrorMessage(addMessage.error)}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap justify-between gap-3">
              <button
                className="min-h-11 rounded-xl px-4 font-bold text-red-700 hover:bg-red-50"
                type="button"
                onClick={() => setConfirmClose(true)}
              >
                {t("Close request")}
              </button>
              <button
                className="min-h-11 rounded-xl bg-brand-700 px-6 font-black text-white disabled:opacity-50"
                type="submit"
                disabled={message.trim().length < 2 || addMessage.isPending}
              >
                {t(addMessage.isPending ? "Sending…" : "Send reply")}
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-8 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
            {t("This support request is closed.")}
          </p>
        )}
      </div>

      {confirmClose ? (
        <ConfirmationDialog
          title={t("Close this support request?")}
          description={t("You will no longer be able to add messages to this conversation.")}
          confirmLabel={t("Close request")}
          tone="danger"
          isPending={closeTicket.isPending}
          details={
            closeTicket.isError ? (
              <p className="font-semibold text-red-700">
                {getApiErrorMessage(closeTicket.error)}
              </p>
            ) : null
          }
          onCancel={() => setConfirmClose(false)}
          onConfirm={() => {
            void closeTicket
              .mutateAsync()
              .then(() => setConfirmClose(false))
              .catch(() => undefined);
          }}
        />
      ) : null}
    </section>
  );
}
