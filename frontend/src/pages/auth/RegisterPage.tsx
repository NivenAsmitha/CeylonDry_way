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

export function RegisterPage() {
  const { t } = useLanguage();
  const { register: registerAccount, isAuthenticated } = useAuth();
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
    return <Navigate to="/profile" replace />;
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
      navigate("/login", {
        replace: true,
        state: { notice: "registration-success" },
      });
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error));
    }
  }

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="bg-brand-950 p-7 text-white sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">
            {t("Join ComfortGo")}
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            {t("Create your account.")}
          </h1>
          <p className="mt-4 leading-7 text-brand-100">
            {t(
              "Your new account receives the safe Client role automatically. Additional roles are never selected during public registration.",
            )}
          </p>
          <ul className="mt-8 space-y-4 text-sm text-brand-50">
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-amber-300">
                ✓
              </span>
              {t("Passwords are protected by the backend and never displayed.")}
            </li>
            <li className="flex gap-3">
              <span aria-hidden="true" className="text-amber-300">
                ✓
              </span>
              {t("Session credentials remain outside browser storage.")}
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
              <Link
                className="font-bold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-900"
                to="/login"
              >
                {t("Sign in")}
              </Link>
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
