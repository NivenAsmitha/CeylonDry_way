import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormField } from "../../components/common/FormField";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  registerSchema,
  type RegisterFormValues,
} from "../../features/auth/schemas/register.schema";
import { getApiErrorMessage } from "../../types/api.types";
import { useLanguage } from "../../i18n/useLanguage";
import { getRoleLandingPath } from "../../utils/navigation";

interface RegisterPageProps {
  embedded?: boolean;
  onRegistered?: () => void;
  onViewChange?: (view: "login") => void;
}

export function RegisterPage({
  embedded = false,
  onRegistered,
  onViewChange,
}: RegisterPageProps = {}) {
  const { t } = useLanguage();
  const { register: registerAccount, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  if (isAuthenticated) {
    return (
      <Navigate
        to={getRoleLandingPath(user?.roles ?? [], user?.permissions ?? [])}
        replace
      />
    );
  }

  async function onSubmit(values: RegisterFormValues): Promise<void> {
    setServerError(null);

    try {
      const phone = values.phone.trim();
      await registerAccount({
        name: values.name,
        email: values.email,
        password: values.password,
        ...(phone ? { phone } : {}),
      });
      if (onRegistered) {
        onRegistered();
        return;
      }
      navigate("/login", {
        replace: true,
        state: { notice: "registration-success" },
      });
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error));
    }
  }

  return (
    <section className={embedded ? "" : "px-4 py-10 sm:px-6 sm:py-14"}>
      <div
        className={`grid overflow-hidden lg:grid-cols-[0.8fr_1.2fr] ${
          embedded
            ? "rounded-[2rem] bg-white/20"
            : "mx-auto max-w-5xl rounded-[2rem] border border-slate-200 bg-white shadow-xl"
        }`}
      >
        <aside className="border-b border-white/70 bg-gradient-to-br from-brand-100/80 via-white/55 to-cyan-50/70 p-7 text-slate-950 backdrop-blur-xl sm:p-10 lg:border-b-0 lg:border-r">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
            {t("Join ComfortGo")}
          </p>
          <h1
            className="mt-4 text-3xl font-black tracking-tight sm:text-4xl"
            id="auth-register-title"
          >
            {t("Create your account.")}
          </h1>
          <p className="mt-4 leading-7 text-slate-600">
            {t(
              "Everything you need for a more comfortable journey, in one place.",
            )}
          </p>
          <ul className="mt-7 space-y-3">
            <li className="flex gap-3 rounded-2xl border border-white/80 bg-white/55 p-3.5 shadow-[0_10px_30px_rgba(21,79,115,0.07)] backdrop-blur-md">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-[0.65rem] font-black tracking-wider text-white shadow-sm"
              >
                01
              </span>
              <span>
                <strong className="block text-sm text-slate-900">
                  {t("Find nearby facilities")}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {t(
                    "Search by location and compare the details that matter.",
                  )}
                </span>
              </span>
            </li>
            <li className="flex gap-3 rounded-2xl border border-white/80 bg-white/55 p-3.5 shadow-[0_10px_30px_rgba(21,79,115,0.07)] backdrop-blur-md">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-[0.65rem] font-black tracking-wider text-white shadow-sm"
              >
                02
              </span>
              <span>
                <strong className="block text-sm text-slate-900">
                  {t("Travel with confidence")}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {t(
                    "Check amenities, accessibility, ratings and recent photos.",
                  )}
                </span>
              </span>
            </li>
            <li className="flex gap-3 rounded-2xl border border-white/80 bg-white/55 p-3.5 shadow-[0_10px_30px_rgba(21,79,115,0.07)] backdrop-blur-md">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-700 text-[0.65rem] font-black tracking-wider text-white shadow-sm"
              >
                03
              </span>
              <span>
                <strong className="block text-sm text-slate-900">
                  {t("Help the community")}
                </strong>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {t(
                    "Share ratings, report updates or list a useful facility.",
                  )}
                </span>
              </span>
            </li>
          </ul>
        </aside>

        <div className="p-6 sm:p-10">
          <div className="mb-7">
            <h2 className="text-2xl font-black text-slate-950">
              {t("Your details")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t("Already registered?")}{" "}
              {onViewChange ? (
                <button
                  className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-900"
                  type="button"
                  onClick={() => onViewChange("login")}
                >
                  {t("Sign in")}
                </button>
              ) : (
                <Link
                  className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-900"
                  to="/login"
                >
                  {t("Sign in")}
                </Link>
              )}
            </p>
          </div>

          {serverError ? (
            <div className="mb-6">
              <ErrorMessage
                message={serverError}
                title={t("Registration failed")}
              />
            </div>
          ) : null}

          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          >
            <FormField
              id="register-name"
              label={t("Full name")}
              autoComplete="name"
              error={errors.name?.message}
              {...registerField("name")}
            />
            <FormField
              id="register-email"
              label={t("Email address")}
              type="email"
              autoComplete="email"
              error={errors.email?.message}
              {...registerField("email")}
            />
            <FormField
              id="register-phone"
              label={t("Phone number (optional)")}
              type="tel"
              autoComplete="tel"
              error={errors.phone?.message}
              {...registerField("phone")}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="register-password"
                label={t("Password")}
                type="password"
                autoComplete="new-password"
                hint={t("Use 12–128 characters.")}
                error={errors.password?.message}
                {...registerField("password")}
              />
              <FormField
                id="register-confirm-password"
                label={t("Confirm password")}
                type="password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...registerField("confirmPassword")}
              />
            </div>
            <button
              className="min-h-12 w-full rounded-xl bg-brand-700 px-5 py-3 font-extrabold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {t(isSubmitting ? "Creating account…" : "Create account")}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
