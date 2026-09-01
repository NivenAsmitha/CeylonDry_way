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

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const locationState: unknown = location.state;
  const destination = getSafeRedirectPath(
    locationState,
    getRoleLandingPath(user?.roles ?? []),
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
      navigate(
        getSafeRedirectPath(
          locationState,
          getRoleLandingPath(authenticatedUser.roles),
        ),
        { replace: true },
      );
    } catch (error: unknown) {
      const normalizedError = normalizeApiError(error);
      setServerError(
        normalizedError.statusCode === 401
          ? "Invalid email or password."
          : normalizedError.messages.join(" "),
      );
    }
  }

  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-md rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          Welcome back
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          Sign in to your account
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          New to Ceylon DryWay?{" "}
          <Link
            className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-900"
            to="/register"
          >
            Create an account
          </Link>
        </p>

        {registrationSucceeded ? (
          <div
            className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            role="status"
          >
            Account created successfully. Sign in with your new credentials.
          </div>
        ) : null}

        {passwordChanged ? (
          <div
            className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-900"
            role="status"
          >
            Password changed successfully. Sign in with your new password.
          </div>
        ) : null}

        {serverError ? (
          <div className="mt-6">
            <ErrorMessage message={serverError} title="Sign-in failed" />
          </div>
        ) : null}

        <form
          className="mt-7 space-y-5"
          noValidate
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
        >
          <FormField
            id="login-email"
            label="Email address"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
          <FormField
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <p className="text-xs text-slate-500">
            Forgot password? Recovery is coming in a later phase.
          </p>
          <button
            className="min-h-12 w-full rounded-xl bg-brand-700 px-5 py-3 font-extrabold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-wait disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </section>
  );
}
