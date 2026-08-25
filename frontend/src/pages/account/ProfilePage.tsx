import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { FormField } from "../../components/common/FormField";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  profileSchema,
  type ProfileFormValues,
} from "../../features/auth/schemas/profile.schema";
import { SUPPORTED_LANGUAGES } from "../../features/auth/types/auth.types";
import { getApiErrorMessage } from "../../types/api.types";
import { getRoleLabel } from "../../utils/roles";

function formatAccountDate(value: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-LK", {
        dateStyle: "medium",
      }).format(date);
}

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [updateSucceeded, setUpdateSucceeded] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      language: "en",
    },
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        phone: user.phone ?? "",
        language: "en",
      });
    }
  }, [reset, user]);

  if (!user) {
    return <LoadingScreen message="Loading your profile…" />;
  }

  async function onSubmit(values: ProfileFormValues): Promise<void> {
    setServerError(null);
    setUpdateSucceeded(false);

    try {
      await updateProfile({
        name: values.name,
        phone: values.phone || null,
        language: values.language,
      });
      setUpdateSucceeded(true);
    } catch (error: unknown) {
      setServerError(getApiErrorMessage(error));
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            Your account
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Profile
          </h1>
          <p className="mt-2 text-slate-600">
            Review your account and update the details currently supported.
          </p>
        </div>
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-bold text-emerald-900">
          <span
            className="size-2 rounded-full bg-emerald-600"
            aria-hidden="true"
          />
          {user.status === "ACTIVE" ? "Active account" : user.status}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <aside className="rounded-3xl bg-slate-950 p-6 text-white shadow-lg sm:p-8">
          <div className="grid size-16 place-items-center rounded-2xl bg-emerald-700 text-2xl font-black">
            {user.name.slice(0, 1).toUpperCase()}
          </div>
          <h2 className="mt-5 text-2xl font-black">{user.name}</h2>
          <p className="mt-1 break-all text-sm text-slate-300">{user.email}</p>

          <div className="mt-7 border-t border-slate-700 pt-6">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Current roles
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs font-bold text-amber-200"
                  key={role}
                >
                  {getRoleLabel(role)} role
                </span>
              ))}
            </div>
          </div>

          <dl className="mt-7 space-y-4 text-sm">
            <div>
              <dt className="font-semibold text-slate-400">Member since</dt>
              <dd className="mt-1 text-white">
                {formatAccountDate(user.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-slate-400">Email</dt>
              <dd className="mt-1 text-white">Verified changes coming later</dd>
            </div>
          </dl>
        </aside>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-slate-950">Edit profile</h2>
          <p className="mt-2 text-sm text-slate-600">
            Email, status, roles, and security credentials cannot be changed
            here.
          </p>

          {serverError ? (
            <div className="mt-6">
              <ErrorMessage message={serverError} title="Update failed" />
            </div>
          ) : null}
          {updateSucceeded ? (
            <div
              className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900"
              role="status"
            >
              Your profile was updated successfully.
            </div>
          ) : null}

          <form
            className="mt-7 space-y-5"
            noValidate
            onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          >
            <FormField
              id="profile-name"
              label="Full name"
              autoComplete="name"
              error={errors.name?.message}
              {...register("name")}
            />
            <FormField
              id="profile-phone"
              label="Phone number"
              type="tel"
              autoComplete="tel"
              error={errors.phone?.message}
              {...register("phone")}
            />
            <div>
              <label
                className="mb-2 block text-sm font-semibold text-slate-800"
                htmlFor="profile-language"
              >
                Language
              </label>
              <select
                className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                id="profile-language"
                aria-invalid={Boolean(errors.language)}
                aria-describedby={
                  errors.language ? "profile-language-error" : undefined
                }
                {...register("language")}
              >
                {SUPPORTED_LANGUAGES.map((language) => (
                  <option value={language} key={language}>
                    English
                  </option>
                ))}
              </select>
              {errors.language?.message ? (
                <p
                  className="mt-2 text-sm font-medium text-red-700"
                  id="profile-language-error"
                >
                  {errors.language.message}
                </p>
              ) : null}
            </div>
            <button
              className="min-h-12 rounded-xl bg-emerald-700 px-6 py-3 font-extrabold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving changes…" : "Save profile"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
