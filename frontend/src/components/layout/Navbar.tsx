import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return `flex min-h-11 items-center rounded-xl px-3 py-2 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
    isActive
      ? "bg-emerald-100 text-emerald-950"
      : "text-slate-700 hover:bg-slate-100 hover:text-emerald-900"
  }`;
}

function FutureLink({ children }: { children: string }) {
  return (
    <span
      className="flex min-h-11 cursor-not-allowed items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-400"
      aria-disabled="true"
      title="Coming in a future phase"
    >
      {children}
      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-slate-500">
        Soon
      </span>
    </span>
  );
}

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  async function handleLogout(): Promise<void> {
    setIsLoggingOut(true);

    try {
      await logout();
    } catch {
      // Local authentication state is cleared even when the network is down.
    } finally {
      setIsLoggingOut(false);
      navigate("/", { replace: true });
    }
  }

  const hasOwnerRole = user?.roles.includes("OWNER") ?? false;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Primary navigation"
      >
        <Link
          className="flex min-h-11 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          to="/"
          onClick={() => setMenuOpen(false)}
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
            <NavLink
              className={navLinkClass}
              end
              to="/"
              onClick={() => setMenuOpen(false)}
            >
              Home
            </NavLink>
            <FutureLink>Explore</FutureLink>
            <FutureLink>Map</FutureLink>
            <FutureLink>List your property</FutureLink>
            {hasOwnerRole ? <FutureLink>Owner tools</FutureLink> : null}

            <span className="my-2 h-px bg-slate-200 lg:mx-2 lg:my-0 lg:h-7 lg:w-px" />

            {isAuthenticated ? (
              <>
                <NavLink
                  className={navLinkClass}
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                >
                  Profile
                </NavLink>
                <button
                  className="min-h-11 rounded-xl bg-slate-900 px-4 py-2 text-left text-sm font-bold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60 lg:text-center"
                  type="button"
                  disabled={isLoggingOut}
                  onClick={() => void handleLogout()}
                >
                  {isLoggingOut ? "Signing out…" : "Logout"}
                </button>
              </>
            ) : (
              <>
                <NavLink
                  className={navLinkClass}
                  to="/login"
                  onClick={() => setMenuOpen(false)}
                >
                  Login
                </NavLink>
                <Link
                  className="flex min-h-11 items-center rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  to="/register"
                  onClick={() => setMenuOpen(false)}
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
