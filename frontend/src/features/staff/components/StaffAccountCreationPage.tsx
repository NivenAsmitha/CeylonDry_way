import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { FormField } from "../../../components/common/FormField";
import { getApiErrorMessage } from "../../../types/api.types";
import {
  staffAccountFormSchema,
  type StaffAccountFormValues,
} from "../schemas/staff-account.schema";
import type {
  CreateStaffAccountInput,
  CreatedStaffAccount,
} from "../types/staff-account.types";

interface StaffAccountCreationPageProps {
  actorLabel: "ADMIN" | "DEVELOPER";
  targetLabel: "REVIEWER" | "ADMIN";
  title: string;
  description: string;
  createAccount: (
    input: CreateStaffAccountInput,
  ) => Promise<CreatedStaffAccount>;
}

export function StaffAccountCreationPage({
  actorLabel,
  targetLabel,
  title,
  description,
  createAccount,
}: StaffAccountCreationPageProps) {
  const [createdAccount, setCreatedAccount] =
    useState<CreatedStaffAccount | null>(null);
  const mutation = useMutation({ mutationFn: createAccount });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StaffAccountFormValues>({
    resolver: zodResolver(staffAccountFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      temporaryPassword: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: StaffAccountFormValues): Promise<void> {
    setCreatedAccount(null);
    const phone = values.phone.trim();
    const account = await mutation.mutateAsync({
      name: values.name,
      email: values.email,
      temporaryPassword: values.temporaryPassword,
      ...(phone ? { phone } : {}),
    });
    setCreatedAccount(account);
    reset();
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="bg-slate-950 p-7 text-white sm:p-9">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">
            {actorLabel} account management
          </p>
          <h1 className="mt-4 text-3xl font-black tracking-tight">{title}</h1>
          <p className="mt-4 leading-7 text-slate-300">{description}</p>
          <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-900 p-4 text-sm leading-6 text-slate-300">
            The new account receives exactly <strong>{targetLabel}</strong>.
            It does not receive CLIENT or any other role. Share the initial
            password through a separate trusted channel; it is never returned
            by the API.
          </div>
        </aside>

        <div className="p-6 sm:p-9">
          {mutation.isError ? (
            <div className="mb-6">
              <ErrorMessage
                title={`${targetLabel} account was not created`}
                message={getApiErrorMessage(mutation.error)}
              />
            </div>
          ) : null}
          {createdAccount ? (
            <div
              className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"
              role="status"
            >
              <p className="font-black">Account created securely</p>
              <p className="mt-1">
                {createdAccount.name} now has exactly the {targetLabel} role.
                No password or hash was returned.
              </p>
            </div>
          ) : null}

          <form
            className="space-y-5"
            noValidate
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          >
            <FormField
              id="staff-name"
              label="Full name"
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />
            <FormField
              id="staff-email"
              label="Work email"
              type="email"
              autoComplete="off"
              error={errors.email?.message}
              {...register("email")}
            />
            <FormField
              id="staff-phone"
              label="Phone number (optional)"
              type="tel"
              autoComplete="off"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                id="staff-password"
                label="Initial password"
                type="password"
                autoComplete="new-password"
                hint="Use 16-128 characters with upper/lowercase letters, a number, and a symbol."
                error={errors.temporaryPassword?.message}
                {...register("temporaryPassword")}
              />
              <FormField
                id="staff-confirm-password"
                label="Confirm initial password"
                type="password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />
            </div>
            <button
              className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 py-3 font-black text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={mutation.isPending}
            >
              {mutation.isPending
                ? `Creating ${targetLabel.toLowerCase()}...`
                : `Create ${targetLabel.toLowerCase()} account`}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
