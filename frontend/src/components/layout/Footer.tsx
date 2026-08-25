import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p className="font-bold text-white">Ceylon DryWay</p>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Building a clearer, more inclusive way to plan journeys across Sri
            Lanka.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <Link
            className="rounded-md hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"
            to="/"
          >
            Home
          </Link>
          <span aria-label="Property discovery is coming later">
            Explore — coming later
          </span>
        </div>
      </div>
    </footer>
  );
}
