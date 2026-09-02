import { useEffect, useId, useRef, type ReactNode } from "react";

interface ConfirmationDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  isPending?: boolean;
  details?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  tone = "default",
  isPending = false,
  details,
  onCancel,
  onConfirm,
}: ConfirmationDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape" && !isPending) onCancel();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [isPending, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isPending) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <div
          className={`grid size-11 place-items-center rounded-full text-xl font-black ${
            tone === "danger"
              ? "bg-red-100 text-red-700"
              : "bg-brand-100 text-brand-800"
          }`}
          aria-hidden="true"
        >
          {tone === "danger" ? "!" : "?"}
        </div>
        <h2 className="mt-4 text-2xl font-black text-slate-950" id={titleId}>
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600" id={descriptionId}>
          {description}
        </p>
        {details ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {details}
          </div>
        ) : null}
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelButtonRef}
            className="min-h-11 rounded-xl border border-slate-300 px-5 font-bold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-50"
            type="button"
            disabled={isPending}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className={`min-h-11 rounded-xl px-5 font-black text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-50 ${
              tone === "danger"
                ? "bg-red-700 hover:bg-red-800 focus-visible:outline-red-700"
                : "bg-brand-700 hover:bg-brand-800 focus-visible:outline-brand-700"
            }`}
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
