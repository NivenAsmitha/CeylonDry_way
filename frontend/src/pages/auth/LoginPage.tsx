import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormField } from "../../components/common/FormField";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  loginSchema,
  type LoginFormValues,
} from "../../features/auth/schemas/login.schema";
import { normalizeApiError } from "../../types/api.types";
import {
  getSafeRedirectPath,
  getRoleLandingPath,
  hasRegistrationSuccessNotice,
} from "../../utils/navigation";
import { useLanguage } from "../../i18n/useLanguage";
import type { CurrentUser } from "../../features/auth/types/auth.types";

interface LoginPageProps {
  embedded?: boolean;
  onAuthenticated?: (user: CurrentUser) => void;
  onViewChange?: (view: "register" | "forgot-password") => void;
}

export function LoginPage({
  embedded = false,
  onAuthenticated,
  onViewChange,
}: LoginPageProps = {}) {
  const { t } = useLanguage();
  const { login, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState: unknown = location.state;
  const destination = getSafeRedirectPath(
    locationState,
    getRoleLandingPath(user?.roles ?? [], user?.permissions ?? []),
  );
  const registrationSucceeded = hasRegistrationSuccessNotice(locationState);
  const passwordChanged =
    typeof locationState === "object" &&
    locationState !== null &&
    "passwordChanged" in locationState &&
    locationState.passwordChanged === true;
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  if (isAuthenticated) {
    return <Navigate to={destination} replace />;
  }

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setServerError(null);

    try {
      const authenticatedUser = await login(values);
      if (onAuthenticated) {
        onAuthenticated(authenticatedUser);
        return;
      }
      navigate(
        getSafeRedirectPath(
          locationState,
          getRoleLandingPath(
            authenticatedUser.roles,
            authenticatedUser.permissions,
          ),
        ),
        { replace: true },
      );
    } catch (error: unknown) {
      const normalizedError = normalizeApiError(error);
      setServerError(
        normalizedError.statusCode === 401
          ? t("Invalid email or password.")
          : normalizedError.messages.join(" "),
      );
    }
  }

  return (
    <section className={embedded ? "" : "px-4 py-12 sm:px-6 sm:py-16"}>
      <div
        className={
          embedded
            ? "p-6 pr-16 sm:p-9 sm:pr-16"
            : "mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-9"
        }
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          {t("Welcome back")}
        </p>
        <h1
          className="mt-3 text-3xl font-black tracking-tight text-slate-950"
          id="auth-login-title"
        >
          {t("Sign in to your account")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t("New to ComfortGo?")}{" "}
          {onViewChange ? (
            <button
              className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-900"
              type="button"
              onClick={() => onViewChange("register")}
            >
              {t("Create an account")}
            </button>
          ) : (
            <Link
              className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-900"
              to="/register"
            >
              {t("Create an account")}
            </Link>
          )}
        </p>

        {registrationSucceeded ? (
          <div
            className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            role="status"
          >
            {t(
              "Account created successfully. Sign in with your new credentials.",
            )}
          </div>
        ) : null}

        {passwordChanged ? (
          <div
            className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            role="status"
          >
            {t(
              "Password changed successfully. Sign in with your new password.",
            )}
          </div>
        ) : null}

        {serverError ? (
          <div className="mt-6">
            <ErrorMessage message={serverError} title={t("Sign-in failed")} />
          </div>
        ) : null}

        <form
          className="mt-7 space-y-5"
          noValidate
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <FormField
            id="login-email"
            label={t("Email address")}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <FormField
            id="login-password"
            label={t("Password")}
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <div className="flex justify-end">
            {onViewChange ? (
              <button
                className="text-sm font-bold text-brand-700 underline decoration-brand-200 underline-offset-4 transition hover:text-brand-900"
                type="button"
                onClick={() => onViewChange("forgot-password")}
              >
                {t("Forgot password?")}
              </button>
            ) : (
              <Link
                className="text-sm font-bold text-brand-700 underline decoration-brand-200 underline-offset-4 transition hover:text-brand-900"
                to="/forgot-password"
              >
                {t("Forgot password?")}
              </Link>
            )}
          </div>
          <button
            className="min-h-12 w-full rounded-xl bg-brand-700 px-5 py-3 font-extrabold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {t(isSubmitting ? "Signing in…" : "Sign in")}
          </button>
        </form>
      </div>
    </section>
  );
}
