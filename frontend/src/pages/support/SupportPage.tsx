import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import {
  SUPPORT_CATEGORIES,
  supportCategoryLabels,
  type CreateSupportTicketInput,
} from "../../features/support/support.service";
import {
  useCreateSupportTicket,
  useMySupportTickets,
} from "../../features/support/useSupport";
import { useLanguage } from "../../i18n/useLanguage";
import { getApiErrorMessage } from "../../types/api.types";

export function SupportPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const tickets = useMySupportTickets();
  const createTicket = useCreateSupportTicket();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input: CreateSupportTicketInput = {
      category: form.get("category") as CreateSupportTicketInput["category"],
      priority: form.get("priority") as CreateSupportTicketInput["priority"],
      subject: String(form.get("subject") ?? "").trim(),
      message: String(form.get("message") ?? "").trim(),
    };
    try {
      const ticket = await createTicket.mutateAsync(input);
      navigate(`/support/${ticket.id}`);
    } catch {
      // The form renders the mutation error for the client.
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
            {t("Help centre")}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
            {t("Contact support")}
          </h1>
          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
            {t(
              "Send a private message to the ComfortGo review team and follow every reply in one place.",
            )}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {t("You can expect a reply within 24 hours.")}
          </p>
        </div>
        <button
          className="min-h-12 rounded-xl bg-brand-700 px-6 font-black text-white shadow-sm transition hover:bg-brand-800"
          type="button"
          onClick={() => {
            createTicket.reset();
            setShowForm((value) => !value);
          }}
        >
          {t(showForm ? "Cancel new request" : "New support request")}
        </button>
      </div>

      {showForm ? (
        <form
          className="mt-8 rounded-3xl border border-brand-100 bg-white p-6 shadow-sm sm:p-8"
          onSubmit={(event) => void submit(event)}
        >
          <h2 className="text-2xl font-black text-slate-950">
            {t("How can we help?")}
          </h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-black text-slate-900">
              {t("Problem category")}
              <select
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                name="category"
                defaultValue="ACCOUNT_LOGIN"
              >
                {SUPPORT_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t(supportCategoryLabels[category])}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-black text-slate-900">
              {t("Priority")}
              <select
                className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-normal"
                name="priority"
                defaultValue="NORMAL"
              >
                <option value="NORMAL">{t("Normal")}</option>
                <option value="URGENT">
                  {t("Urgent safety or access problem")}
                </option>
              </select>
            </label>
          </div>
          <label className="mt-5 block text-sm font-black text-slate-900">
            {t("Subject")}
            <input
              className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 px-4 font-normal"
              name="subject"
              minLength={5}
              maxLength={140}
              required
            />
          </label>
          <label className="mt-5 block text-sm font-black text-slate-900">
            {t("Message")}
            <textarea
              className="mt-2 min-h-40 w-full rounded-xl border border-slate-300 px-4 py-3 font-normal leading-6"
              name="message"
              minLength={10}
              maxLength={2000}
              required
              placeholder={t(
                "Explain what happened, what you expected, and which facility or feature is affected.",
              )}
            />
          </label>
          {createTicket.isError ? (
            <div className="mt-5">
              <ErrorMessage message={getApiErrorMessage(createTicket.error)} />
            </div>
          ) : null}
          <div className="mt-6 flex justify-end">
            <button
              className="min-h-12 rounded-xl bg-slate-950 px-6 font-black text-white disabled:opacity-50"
              type="submit"
              disabled={createTicket.isPending}
            >
              {t(createTicket.isPending ? "Sending…" : "Send support request")}
            </button>
          </div>
        </form>
      ) : null}

      <div className="mt-10">
        <h2 className="text-2xl font-black text-slate-950">
          {t("My support requests")}
        </h2>
        {tickets.isPending ? <LoadingScreen message="Loading support requests…" /> : null}
        {tickets.isError ? (
          <div className="mt-6">
            <ErrorMessage message={getApiErrorMessage(tickets.error)} />
          </div>
        ) : null}
        {tickets.data ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {tickets.data.items.map((ticket) => (
              <Link
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
                key={ticket.id}
                to={`/support/${ticket.id}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase tracking-wide text-brand-700">
                    CG-{ticket.ticketNumber.toString().padStart(6, "0")}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">
                    {ticket.status.replaceAll("_", " ")}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-black text-slate-950">
                  {ticket.subject}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {t(supportCategoryLabels[ticket.category])} · {ticket._count.messages}{" "}
                  {t("messages")}
                </p>
                <p className="mt-4 text-xs font-semibold text-slate-500">
                  {t("Updated")} {new Date(ticket.updatedAt).toLocaleString()}
                </p>
              </Link>
            ))}
            {tickets.data.items.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600 md:col-span-2">
                {t("You have not created any support requests yet.")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
