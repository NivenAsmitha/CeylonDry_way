import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="grid min-h-[60vh] place-items-center px-4 py-14 text-center">
      <div className="max-w-lg">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-brand-700">
          404 · Page not found
        </p>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950">
          That route is not on the map.
        </h1>
        <p className="mt-4 leading-7 text-slate-600">
          The address may be incorrect, or this feature may not be available in
          ComfortGo yet.
        </p>
        <Link
          className="mt-7 inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-6 py-3 font-bold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          to="/"
        >
          Go to the homepage
        </Link>
      </div>
    </section>
  );
}
