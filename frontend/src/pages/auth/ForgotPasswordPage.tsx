import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormField } from "../../components/common/FormField";
import * as authService from "../../features/auth/auth.service";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../../features/auth/schemas/forgot-password.schema";
import { useLanguage } from "../../i18n/useLanguage";
import { getApiErrorMessage } from "../../types/api.types";

interface ForgotPasswordPageProps {
  embedded?: boolean;
  onViewChange?: (view: "login") => void;
}

export function ForgotPasswordPage({
  embedded = false,
  onViewChange,
}: ForgotPasswordPageProps = {}) {
  const { t } = useLanguage();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const mutation = useMutation({
    mutationFn: authService.requestPasswordReset,
  });

  return (
    <section className={embedded ? "" : "px-4 py-12 sm:px-6 sm:py-16"}>
      <div
        className={
          embedded
            ? "p-6 pr-16 sm:p-9 sm:pr-16"
            : "mx-auto max-w-md rounded-4xl border border-slate-200 bg-white p-6 shadow-xl sm:p-9"
        }
      >
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
          {t("Account recovery")}
        </p>
        <h1
          className="mt-3 text-3xl font-black tracking-tight text-slate-950"
          id="auth-forgot-password-title"
        >
          {t("Reset your password")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {t(
            "Enter your account email and we will send you a secure, one-time reset link.",
          )}
        </p>

        {mutation.isSuccess ? (
          <div
            className="mt-7 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-brand-950"
            role="status"
          >
            <p className="font-black">{t("Check your email")}</p>
            <p className="mt-2 text-sm leading-6">
              {t(
                "If an active account exists for that email, password reset instructions have been sent.",
              )}
            </p>
            <p className="mt-2 text-xs leading-5 text-brand-800">
              {t("The reset link expires in 30 minutes and works only once.")}
            </p>
          </div>
        ) : (
          <form
            className="mt-7 space-y-5"
            noValidate
            onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
          >
            <FormField
              id="forgot-password-email"
              label={t("Email address")}
              type="email"
              autoComplete="email"
              error={form.formState.errors.email?.message}
              {...form.register("email")}
            />
            {mutation.isError ? (
              <ErrorMessage
                title={t("Request could not be sent")}
                message={getApiErrorMessage(mutation.error)}
              />
            ) : null}
            <button
              className="min-h-12 w-full rounded-xl bg-brand-700 px-5 py-3 font-extrabold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={mutation.isPending}
            >
              {t(mutation.isPending ? "Sending reset link…" : "Send reset link")}
            </button>
          </form>
        )}

        {onViewChange ? (
          <button
            className="mt-6 inline-flex text-sm font-bold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:text-brand-900"
            type="button"
            onClick={() => onViewChange("login")}
          >
            {t("Back to login")}
          </button>
        ) : (
          <Link
            className="mt-6 inline-flex text-sm font-bold text-brand-700 underline decoration-brand-200 underline-offset-4 hover:text-brand-900"
            to="/login"
          >
            {t("Back to login")}
          </Link>
        )}
      </div>
    </section>
  );
}
