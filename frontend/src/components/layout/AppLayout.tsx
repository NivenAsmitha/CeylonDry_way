import { Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/hooks/useAuth";
import { ErrorMessage } from "../common/ErrorMessage";
import { Footer } from "./Footer";
import { Navbar } from "./Navbar";

export function AppLayout() {
  const { initializationError } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50 text-slate-900">
      <a
        className="sr-only z-50 rounded-md bg-white px-4 py-3 font-semibold text-emerald-900 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        href="#main-content"
      >
        Skip to content
      </a>
      <Navbar />
      <main className="flex-1" id="main-content">
        {initializationError ? (
          <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
            <ErrorMessage
              title="Session restoration is unavailable"
              message={initializationError}
            />
          </div>
        ) : null}
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
