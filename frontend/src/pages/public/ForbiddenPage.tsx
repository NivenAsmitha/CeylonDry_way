import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <section className="grid min-h-[60vh] place-items-center px-4 py-14 text-center">
      <div className="max-w-lg">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-700">
          403 · Access denied
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
          This area is not available for your current role.
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          Role-based navigation improves the experience, while the backend
          remains the authority for every protected action.
        </p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-6 py-3 font-bold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          to="/"
        >
          Return home
        </Link>
      </div>
    </section>
  );
}
