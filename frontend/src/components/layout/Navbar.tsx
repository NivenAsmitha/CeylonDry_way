import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import logo from "../../assets/logo.png";
import { useAuth } from "../../features/auth/hooks/useAuth";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `flex min-h-10 items-center rounded-xl px-3.5 py-2 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
    isActive
      ? "bg-white text-brand-800 shadow-sm ring-1 ring-slate-200"
      : "text-slate-600 hover:bg-brand-50 hover:text-brand-900"
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
  const workspaceHome = hasDeveloperRole
    ? "/developer/operations"
    : hasAdminRole
      ? "/admin/reports"
      : hasReviewerRole
        ? "/reviewer"
        : "/";

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/95 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        <Link
          className="group flex min-h-12 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          to={workspaceHome}
          aria-label="ComfortGo home"
          onClick={closeMenu}
        >
          <img
            className="h-12 w-auto max-w-[7.75rem] object-contain transition group-hover:-translate-y-0.5 sm:h-14 sm:max-w-[9rem]"
            src={logo}
            alt=""
          />
          <span className="ml-3 hidden border-l border-brand-100 pl-3 text-xs font-bold leading-5 text-slate-500 md:block">
            Find your nearest
            <span className="block text-brand-800">clean stop</span>
          </span>
        </Link>

        <button
          className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-brand-200 bg-brand-50 text-brand-900 transition hover:bg-brand-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 lg:hidden"
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
          className={`absolute inset-x-0 top-full border-b border-brand-100 bg-white p-4 shadow-xl lg:static lg:flex lg:flex-1 lg:items-center lg:justify-end lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none ${
            menuOpen ? "block" : "hidden lg:flex"
          }`}
          id="primary-menu"
        >
          <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:rounded-2xl lg:border lg:border-slate-200 lg:bg-slate-50/80 lg:p-1">
            {showPublicNavigation ? (
              <>
                <NavLink
                  className={navLinkClass}
                  end
                  to="/"
                  onClick={closeMenu}
                >
                  Home
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/explore"
                  onClick={closeMenu}
                >
                  Explore
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/about"
                  onClick={closeMenu}
                >
                  About
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
                <NavLink
                  className={navLinkClass}
                  to="/reviewer"
                  onClick={closeMenu}
                >
                  Review queue
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/reviewer/properties"
                  onClick={closeMenu}
                >
                  Add properties
                </NavLink>
              </>
            ) : null}
            {isAuthenticated && hasAdminRole ? (
              <>
                <NavLink
                  className={navLinkClass}
                  to="/admin/users"
                  onClick={closeMenu}
                >
                  Users
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/admin/reviewers"
                  onClick={closeMenu}
                >
                  Reviewers
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/admin/properties"
                  onClick={closeMenu}
                >
                  Properties
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/admin/reports"
                  onClick={closeMenu}
                >
                  Reports
                </NavLink>
              </>
            ) : null}
            {isAuthenticated && hasDeveloperRole ? (
              <>
                <NavLink
                  className={navLinkClass}
                  to="/developer/users"
                  onClick={closeMenu}
                >
                  Users
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/developer/admins"
                  onClick={closeMenu}
                >
                  Admins
                </NavLink>
                <NavLink
                  className={navLinkClass}
                  to="/developer/operations"
                  onClick={closeMenu}
                >
                  Operations
                </NavLink>
              </>
            ) : null}

            {isAuthenticated && user ? (
              <Link
                className="mt-2 flex min-h-10 items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-brand-200 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 lg:ml-1 lg:mt-0"
                to="/profile"
                aria-label="Open your profile"
                onClick={closeMenu}
              >
                <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-xs font-black text-white ring-2 ring-brand-100">
                  {user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="max-w-28 truncate">Profile</span>
              </Link>
            ) : (
              <>
                <NavLink
                  className={navLinkClass}
                  to="/login"
                  onClick={closeMenu}
                >
                  Login
                </NavLink>
                <Link
                  className="flex min-h-10 items-center justify-center rounded-xl bg-brand-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
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
