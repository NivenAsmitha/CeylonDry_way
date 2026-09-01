import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormField } from "../../components/common/FormField";
import * as authService from "../../features/auth/auth.service";
import {
  resetPasswordSchema,
  type ResetPasswordFormInput,
} from "../../features/auth/schemas/reset-password.schema";
import { getApiErrorMessage } from "../../types/api.types";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const tokenLooksValid = token.length >= 32 && token.length <= 512;
  const form = useForm<ResetPasswordFormInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });
  const mutation = useMutation({
    mutationFn: (input: ResetPasswordFormInput) =>
      authService.resetPassword({ token, ...input }),
  });

  return (
    <section className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
          Account recovery
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          Set a new password
        </h1>
        <p className="mt-3 text-slate-600">
          This one-time link expires quickly. Completing the reset revokes all
          existing sessions and does not sign you in automatically.
        </p>

        {!tokenLooksValid ? (
          <div className="mt-6">
            <ErrorMessage
              title="Reset link is invalid"
              message="Request a new reset link from account support."
            />
          </div>
        ) : mutation.isSuccess ? (
          <div
            className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-5 text-brand-950"
            role="status"
          >
            <p className="font-black">Password updated</p>
            <p className="mt-1 text-sm">
              Your old sessions are now invalid. Sign in with the new password.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-5 font-bold text-white"
              to="/login"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <form
            className="mt-7 space-y-5"
            onSubmit={form.handleSubmit((input) => mutation.mutate(input))}
          >
            <FormField
              id="reset-new-password"
              label="New password"
              type="password"
              autoComplete="new-password"
              error={form.formState.errors.newPassword?.message}
              {...form.register("newPassword")}
            />
            <FormField
              id="reset-confirm-password"
              label="Confirm new password"
              type="password"
              autoComplete="new-password"
              error={form.formState.errors.confirmPassword?.message}
              {...form.register("confirmPassword")}
            />
            {mutation.isError ? (
              <ErrorMessage message={getApiErrorMessage(mutation.error)} />
            ) : null}
            <button
              className="min-h-12 w-full rounded-xl bg-brand-700 px-5 font-black text-white disabled:opacity-50"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "Updating password…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
