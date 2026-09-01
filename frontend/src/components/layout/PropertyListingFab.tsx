import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

export function PropertyListingFab() {
  const { user, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const canList = user?.roles.includes("CLIENT") ?? false;
  const hasProperties = user?.roles.includes("OWNER") ?? false;
  const isStaffOnly =
    Boolean(user) &&
    !canList &&
    user!.roles.some((role) =>
      ["REVIEWER", "ADMIN", "DEVELOPER"].includes(role),
    );

  useEffect(() => {
    if (!open) return;

    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (isStaffOnly) return null;

  return (
    <>
      <button
        className="group fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-brand-700 text-3xl font-light text-white shadow-[0_16px_45px_rgba(6,78,59,0.35)] transition hover:-translate-y-1 hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700 sm:bottom-7 sm:right-7 sm:size-16"
        type="button"
        aria-label="List a property"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true" className="-mt-1">
          +
        </span>
        <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-lg group-hover:block group-focus-visible:block sm:block sm:opacity-0 sm:transition sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
          List a property
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-end bg-slate-950/60 p-3 backdrop-blur-sm sm:place-items-center sm:p-6"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="property-action-title"
            ref={dialogRef}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-700">
                  Help travellers plan better
                </p>
                <h2
                  className="mt-2 text-2xl font-black tracking-tight text-slate-950"
                  id="property-action-title"
                >
                  Add a useful place
                </h2>
              </div>
              <button
                className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 text-xl text-slate-700 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                type="button"
                aria-label="Close property listing dialog"
                ref={closeRef}
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </div>

            <p className="mt-4 leading-7 text-slate-600">
              Create a private draft, add accurate facilities and photos, then
              send it to a reviewer before it becomes public.
            </p>

            {isAuthenticated && canList ? (
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-700 px-5 text-center font-black text-white hover:bg-brand-800"
                  to="/list-property"
                  onClick={() => setOpen(false)}
                >
                  Start a listing
                </Link>
                {hasProperties ? (
                  <Link
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 text-center font-black text-slate-800 hover:bg-slate-50"
                    to="/owner/properties"
                    onClick={() => setOpen(false)}
                  >
                    My properties
                  </Link>
                ) : (
                  <p className="flex items-center text-sm leading-6 text-slate-500">
                    Your owner workspace appears after your first draft is
                    saved.
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-700 px-5 font-black text-white"
                  to="/login"
                  state={{ from: "/list-property" }}
                  onClick={() => setOpen(false)}
                >
                  Sign in to continue
                </Link>
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 px-5 font-black text-slate-800"
                  to="/register"
                  onClick={() => setOpen(false)}
                >
                  Create account
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
