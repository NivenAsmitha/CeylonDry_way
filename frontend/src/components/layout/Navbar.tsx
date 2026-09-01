import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
    isActive
      ? "bg-emerald-100 text-emerald-950"
      : "text-slate-700 hover:bg-slate-100 hover:text-emerald-900"
  }`;
}

export function Navbar() {
  const { user, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu(): void {
    setMenuOpen(false);
  }

  const hasOwnerRole = user?.roles.includes("OWNER") ?? false;
  const hasClientRole = user?.roles.includes("CLIENT") ?? false;
  const hasReviewerRole = user?.roles.includes("REVIEWER") ?? false;
  const hasAdminRole = user?.roles.includes("ADMIN") ?? false;
  const hasDeveloperRole = user?.roles.includes("DEVELOPER") ?? false;
  const showPublicNavigation =
    !isAuthenticated || hasClientRole || hasOwnerRole;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        <Link
          className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          to={hasReviewerRole ? "/reviewer" : "/"}
          onClick={closeMenu}
        >
          <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-lg font-black text-white shadow-sm">
            CD
          </span>
          <span>
            <span className="block text-sm font-black tracking-tight text-slate-950 sm:text-base">
              Ceylon DryWay
            </span>
            <span className="hidden text-xs text-slate-500 sm:block">
              Travel with confidence
            </span>
          </span>
        </Link>

        <button
          className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:hidden"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="primary-menu"
          aria-label={
            menuOpen ? "Close navigation menu" : "Open navigation menu"
          }
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true" className="text-xl">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>

        <div
          className={`absolute inset-x-0 top-full border-b border-slate-200 bg-white p-4 shadow-xl lg:static lg:flex lg:flex-1 lg:items-center lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
            menuOpen ? "block" : "hidden lg:flex"
          }`}
          id="primary-menu"
        >
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center">
            {showPublicNavigation ? (
              <>
                <NavLink className={navLinkClass} end to="/" onClick={closeMenu}>
                  Home
                </NavLink>
                <NavLink className={navLinkClass} to="/explore" onClick={closeMenu}>
                  Explore
                </NavLink>
                <NavLink className={navLinkClass} to="/map" onClick={closeMenu}>
                  Map
                </NavLink>
              </>
            ) : null}

            {isAuthenticated && hasOwnerRole ? (
              <NavLink
                className={navLinkClass}
                to="/owner/properties"
                onClick={closeMenu}
              >
                My Properties
              </NavLink>
            ) : null}
            {isAuthenticated && hasReviewerRole ? (
              <>
                <NavLink className={navLinkClass} to="/reviewer" onClick={closeMenu}>
                  Review queue
                </NavLink>
                <NavLink className={navLinkClass} to="/reviewer/properties" onClick={closeMenu}>
                  Add properties
                </NavLink>
              </>
            ) : null}
            {isAuthenticated && hasAdminRole ? (
              <>
                <NavLink className={navLinkClass} to="/admin/users" onClick={closeMenu}>
                  Users
                </NavLink>
                <NavLink className={navLinkClass} to="/admin/reviewers" onClick={closeMenu}>
                  Reviewers
                </NavLink>
                <NavLink className={navLinkClass} to="/admin/properties" onClick={closeMenu}>
                  Properties
                </NavLink>
              </>
            ) : null}
            {isAuthenticated && hasDeveloperRole ? (
              <>
                <NavLink className={navLinkClass} to="/developer/users" onClick={closeMenu}>
                  Users
                </NavLink>
                <NavLink className={navLinkClass} to="/developer/admins" onClick={closeMenu}>
                  Admins
                </NavLink>
              </>
            ) : null}

            {isAuthenticated && user ? (
              <Link
                className="mt-2 flex min-h-11 items-center gap-2.5 rounded-xl px-2 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 lg:ml-2 lg:mt-0"
                to="/profile"
                aria-label="Open your profile"
                onClick={closeMenu}
              >
                <span className="grid size-9 place-items-center rounded-full bg-emerald-700 text-xs font-black text-white ring-2 ring-emerald-100">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-28 truncate lg:hidden xl:block">
                  {user.name}
                </span>
              </Link>
            ) : (
              <>
                <NavLink className={navLinkClass} to="/login" onClick={closeMenu}>
                  Login
                </NavLink>
                <Link
                  className="flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  to="/register"
                  onClick={closeMenu}
                >
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
