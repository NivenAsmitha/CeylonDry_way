import { forwardRef, type InputHTMLAttributes } from "react";

interface FormFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  function FormField(
    { id, label, error, hint, className = "", ...inputProps },
    ref,
  ) {
    const hintId = hint ? `${id}-hint` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy =
      [hintId, errorId].filter(Boolean).join(" ") || undefined;

    return (
      <div>
        <label
          className="mb-2 block text-sm font-semibold text-slate-800"
          htmlFor={id}
        >
          {label}
        </label>
        <input
          {...inputProps}
          ref={ref}
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`min-h-12 w-full rounded-xl border bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:ring-4 ${
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-100"
              : "border-slate-300 focus:border-brand-600 focus:ring-brand-100"
          } ${className}`}
        />
        {hint ? (
          <p className="mt-2 text-xs text-slate-500" id={hintId}>
            {hint}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 text-sm font-medium text-red-700" id={errorId}>
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
