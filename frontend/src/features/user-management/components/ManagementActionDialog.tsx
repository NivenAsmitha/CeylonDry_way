import { useEffect, useRef, useState, type FormEvent } from "react";

interface ManagementActionDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  isPending: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export function ManagementActionDialog({
  title,
  description,
  confirmLabel,
  tone = "default",
  isPending,
  error,
  onCancel,
  onConfirm,
}: ManagementActionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    onConfirm(reason.trim());
  }

  return (
    <dialog
      ref={dialogRef}
      className="m-auto w-[min(92vw,32rem)] rounded-3xl border-0 p-0 shadow-2xl backdrop:bg-slate-950/55"
      aria-labelledby="management-action-title"
      onCancel={(event) => {
        if (isPending) event.preventDefault();
      }}
      onClose={onCancel}
    >
      <form className="p-6 sm:p-8" onSubmit={submit}>
        <h2
          className="text-2xl font-black text-slate-950"
          id="management-action-title"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
        <label className="mt-6 block text-sm font-bold" htmlFor="action-reason">
          Reason
        </label>
        <textarea
          autoFocus
          className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 p-3 outline-none focus:border-brand-700 focus:ring-4 focus:ring-brand-100"
          id="action-reason"
          maxLength={1000}
          minLength={5}
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Enter at least 5 characters. The reason is retained in the audit
          trail.
        </p>
        {error ? (
          <p className="mt-3 text-sm font-semibold text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            className="min-h-11 rounded-xl border border-slate-300 px-5 font-bold disabled:opacity-50"
            type="button"
            disabled={isPending}
            onClick={() => dialogRef.current?.close()}
          >
            Cancel
          </button>
          <button
            className={`min-h-11 rounded-xl px-5 font-black text-white disabled:opacity-50 ${
              tone === "danger"
                ? "bg-red-700 hover:bg-red-800"
                : "bg-brand-700 hover:bg-brand-800"
            }`}
            type="submit"
            disabled={isPending || reason.trim().length < 5}
          >
            {isPending ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
