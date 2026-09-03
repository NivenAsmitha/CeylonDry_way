import { useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { CurrentUser } from "../types/auth.types";
import { LoginPage } from "../../../pages/auth/LoginPage";
import { RegisterPage } from "../../../pages/auth/RegisterPage";
import { ForgotPasswordPage } from "../../../pages/auth/ForgotPasswordPage";
import { useLanguage } from "../../../i18n/useLanguage";
import {
  getRoleLandingPath,
  getSafeRedirectPath,
} from "../../../utils/navigation";

type AuthView = "login" | "register" | "forgot-password";

interface AuthLocationState {
  backgroundLocation?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
  from?: string;
  notice?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getAuthView(pathname: string): AuthView | null {
  if (pathname === "/login") return "login";
  if (pathname === "/register") return "register";
  if (pathname === "/forgot-password") return "forgot-password";
  return null;
}

function readLocationState(value: unknown): AuthLocationState {
  if (!isRecord(value)) return {};
  const background = value.backgroundLocation;
  const backgroundLocation =
    isRecord(background) && typeof background.pathname === "string"
      ? {
          pathname: background.pathname,
          search: typeof background.search === "string" ? background.search : "",
          hash: typeof background.hash === "string" ? background.hash : "",
        }
      : undefined;

  return {
    backgroundLocation,
    from: typeof value.from === "string" ? value.from : undefined,
    notice: typeof value.notice === "string" ? value.notice : undefined,
  };
}

function backgroundPath(state: AuthLocationState): string {
  if (!state.backgroundLocation) return "/";
  return `${state.backgroundLocation.pathname}${state.backgroundLocation.search ?? ""}${state.backgroundLocation.hash ?? ""}`;
}

export function AuthModal() {
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const view = getAuthView(location.pathname);
  const locationState = readLocationState(location.state);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!view) return;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [view]);

  if (!view) return null;

  function close(): void {
    navigate(backgroundPath(locationState), { replace: true });
  }

  function switchView(nextView: AuthView): void {
    navigate(`/${nextView}`, {
      replace: true,
      state: {
        ...locationState,
        ...(nextView === "login" && locationState.notice
          ? { notice: locationState.notice }
          : {}),
      },
    });
  }

  function handleRegistered(): void {
    navigate("/login", {
      replace: true,
      state: { ...locationState, notice: "registration-success" },
    });
  }

  function handleAuthenticated(user: CurrentUser): void {
    const explicitDestination = getSafeRedirectPath(location.state, "");
    const roleLanding = getRoleLandingPath(user.roles, user.permissions);
    const destination = explicitDestination || roleLanding;

    if (destination === "/" && locationState.backgroundLocation) {
      close();
      return;
    }

    navigate(destination || "/", { replace: true });
  }

  function keepFocusInside(event: ReactKeyboardEvent<HTMLDivElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable?.length) return;
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

  return (
    <div
      className="auth-glass-backdrop fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className={`auth-glass-panel relative isolate my-auto max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-[2rem] sm:max-h-[calc(100dvh-3rem)] ${
          view === "register" ? "max-w-4xl" : "max-w-md"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`auth-${view}-title`}
        onKeyDown={keepFocusInside}
      >
        <button
          ref={closeButtonRef}
          className="absolute right-4 top-4 z-20 grid size-11 place-items-center rounded-full border border-white/80 bg-white/65 text-2xl leading-none text-slate-600 shadow-[0_8px_24px_rgba(15,23,42,0.12)] backdrop-blur-xl transition hover:border-brand-200 hover:bg-white/90 hover:text-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          type="button"
          aria-label={t("Close authentication dialog")}
          onClick={close}
        >
          <span aria-hidden="true">×</span>
        </button>

        {view === "login" ? (
          <LoginPage
            embedded
            onAuthenticated={handleAuthenticated}
            onViewChange={switchView}
          />
        ) : view === "register" ? (
          <RegisterPage
            embedded
            onRegistered={handleRegistered}
            onViewChange={switchView}
          />
        ) : (
          <ForgotPasswordPage embedded onViewChange={switchView} />
        )}
      </div>
    </div>
  );
}
