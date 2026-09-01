import { Link } from "react-router-dom";

const footerLinkClass =
  "inline-flex min-h-10 items-center rounded-md text-sm font-medium text-slate-600 transition hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500";

export function Footer() {
  return (
    <footer className="border-t border-brand-100 bg-[#f7fbfe] text-slate-700">
      <div className="mx-auto max-w-7xl px-4 pb-8 pt-14 sm:px-6 sm:pt-16 lg:px-8">
        <div className="grid gap-10 border-b border-brand-100 pb-12 md:grid-cols-2 lg:grid-cols-[1.45fr_0.75fr_0.75fr_1fr]">
          <div>
            <Link
              className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
              to="/"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-700 text-lg font-black text-white shadow-sm">
                CD
              </span>
              <span>
                <span className="block font-black text-slate-950">
                  Ceylon DryWay
                </span>
                <span className="text-xs text-slate-500">
                  Find your nearest clean stop
                </span>
              </span>
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">
              Helping locals and tourists across Sri Lanka find nearby restroom
              facilities, useful amenities and clear directions when they need
              them.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-800 shadow-sm">
              <span className="size-2 rounded-full bg-brand-500" />
              Community-informed · Reviewer-verified
            </div>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-950">
              Discover
            </h2>
            <nav
              className="mt-4 flex flex-col items-start"
              aria-label="Footer discovery links"
            >
              <Link className={footerLinkClass} to="/explore">
                Explore places
              </Link>
              <Link className={footerLinkClass} to="/map">
                Live map
              </Link>
              <Link
                className={footerLinkClass}
                to="/explore?wheelchairAccessible=true"
              >
                Accessible places
              </Link>
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-950">
              Contribute
            </h2>
            <nav
              className="mt-4 flex flex-col items-start"
              aria-label="Footer contribution links"
            >
              <Link className={footerLinkClass} to="/list-property">
                List a property
              </Link>
              <Link className={footerLinkClass} to="/register">
                Create an account
              </Link>
              <Link className={footerLinkClass} to="/login">
                Sign in
              </Link>
            </nav>
          </div>

          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-950">
              How trust works
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Restroom listings are reviewed before publication. Visitors can
              report outdated details so the information remains useful for the
              next journey.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-7 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Ceylon DryWay. Built for more
            comfortable journeys across Sri Lanka.
          </p>
          <p>
            Facility details can change. Confirm critical access needs directly
            when possible.
          </p>
        </div>
      </div>
    </footer>
  );
}
