import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { ConfirmationDialog } from "../../components/common/ConfirmationDialog";
import { FormField } from "../../components/common/FormField";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { useAuth } from "../../features/auth/hooks/useAuth";
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from "../../features/auth/schemas/change-password.schema";
import {
  profileSchema,
  type ProfileFormValues,
} from "../../features/auth/schemas/profile.schema";
import { SUPPORTED_LANGUAGES } from "../../features/auth/types/auth.types";
import { getApiErrorMessage } from "../../types/api.types";
import { getRoleLabel } from "../../utils/roles";

const PROFILE_SECTIONS = ["overview", "edit", "security"] as const;
type ProfileSection = (typeof PROFILE_SECTIONS)[number];

function formatAccountDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unavailable"
    : new Intl.DateTimeFormat("en-LK", { dateStyle: "medium" }).format(date);
}

function isProfileSection(value: string | null): value is ProfileSection {
  return PROFILE_SECTIONS.some((section) => section === value);
}

function settingsLinkClass(active: boolean): string {
  return `inline-flex min-h-12 shrink-0 items-center border-b-2 px-1 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-700 ${
    active
      ? "border-brand-700 text-brand-800"
      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900"
  }`;
}

export function ProfilePage() {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section: ProfileSection = isProfileSection(requestedSection)
    ? requestedSection
    : "overview";
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSucceeded, setProfileSucceeded] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      language: user?.language === "ja" ? "ja" : "en",
    },
  });
  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!user) return;
    profileForm.reset({
      name: user.name,
      phone: user.phone ?? "",
      language: user.language === "ja" ? "ja" : "en",
    });
  }, [profileForm, user]);

  if (!user) return <LoadingScreen message="Loading your profile…" />;

  const workspace = user.roles.includes("DEVELOPER")
    ? { label: "Developer workspace", to: "/developer/operations" }
    : user.roles.includes("ADMIN")
      ? { label: "Administration", to: "/admin/reports" }
      : user.roles.includes("REVIEWER")
        ? { label: "Review queue", to: "/reviewer" }
        : user.roles.includes("OWNER")
          ? { label: "My properties", to: "/owner/properties" }
          : { label: "List a property", to: "/list-property" };

  async function submitProfile(values: ProfileFormValues): Promise<void> {
    setProfileError(null);
    setProfileSucceeded(false);
    try {
      await updateProfile({
        name: values.name,
        phone: values.phone || null,
        language: values.language,
      });
      setProfileSucceeded(true);
    } catch (error: unknown) {
      setProfileError(getApiErrorMessage(error));
    }
  }

  async function submitPassword(
    values: ChangePasswordFormValues,
  ): Promise<void> {
    setPasswordError(null);
    try {
      await changePassword(values);
      passwordForm.reset();
      try {
        await logout();
      } catch {
        // Local credentials are still cleared by the authentication provider.
      }
      navigate("/login", {
        replace: true,
        state: { passwordChanged: true },
      });
    } catch (error: unknown) {
      setPasswordError(getApiErrorMessage(error));
    }
  }

  async function signOut(): Promise<void> {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await logout();
    } catch {
      // Local credentials are cleared even if the network request fails.
    } finally {
      navigate("/login", { replace: true });
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <div
              className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-700 text-xl font-black text-white ring-4 ring-brand-50 sm:size-20 sm:text-2xl"
              aria-hidden="true"
            >
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand-700">
                Your account
              </p>
              <h1 className="truncate text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                {user.name}
              </h1>
              <p className="mt-1 truncate text-sm text-slate-500 sm:text-base">
                {user.email}
              </p>
              <span className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                <span
                  className={`size-2 rounded-full ${user.status === "ACTIVE" ? "bg-green-500" : "bg-amber-500"}`}
                  aria-hidden="true"
                />
                {user.status === "ACTIVE" ? "Active account" : user.status}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-brand-300 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
              to={workspace.to}
            >
              {workspace.label}
            </Link>
            <button
              className="min-h-11 rounded-xl px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700 disabled:opacity-50"
              type="button"
              disabled={isSigningOut}
              onClick={() => setConfirmSignOut(true)}
            >
              {isSigningOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>

        <nav
          className="flex gap-7 overflow-x-auto border-t border-slate-200 px-6 sm:px-8"
          aria-label="Profile sections"
        >
          <Link
            className={settingsLinkClass(section === "overview")}
            to="/profile?section=overview"
            aria-current={section === "overview" ? "page" : undefined}
          >
            Overview
          </Link>
          <Link
            className={settingsLinkClass(section === "edit")}
            to="/profile?section=edit"
            aria-current={section === "edit" ? "page" : undefined}
          >
            Edit profile
          </Link>
          <Link
            className={settingsLinkClass(section === "security")}
            to="/profile?section=security"
            aria-current={section === "security" ? "page" : undefined}
          >
            Password &amp; security
          </Link>
        </nav>
      </div>

      <div className="mt-6 min-w-0">
        {section === "overview" ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-xl font-black text-slate-950">
                Personal information
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                The contact information connected to your account.
              </p>

              <dl className="mt-7 divide-y divide-slate-200 border-y border-slate-200">
                <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-slate-500">
                    Full name
                  </dt>
                  <dd className="font-semibold text-slate-900">{user.name}</dd>
                </div>
                <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-slate-500">
                    Email address
                  </dt>
                  <dd className="break-all font-semibold text-slate-900">
                    {user.email}
                  </dd>
                </div>
                <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-slate-500">
                    Phone number
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {user.phone || "Not provided"}
                  </dd>
                </div>
                <div className="grid gap-1 py-4 sm:grid-cols-[11rem_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-slate-500">
                    Member since
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {formatAccountDate(user.createdAt)}
                  </dd>
                </div>
              </dl>
            </section>

            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Account access
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Your assigned roles determine which areas you can use.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {user.roles.map((role) => (
                  <span
                    className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-800 ring-1 ring-inset ring-brand-200"
                    key={role}
                  >
                    {getRoleLabel(role)}
                  </span>
                ))}
              </div>
              <p className="mt-5 border-t border-slate-200 pt-5 text-xs leading-5 text-slate-500">
                Platform roles can only be changed by an authorized
                administrator.
              </p>
            </aside>
          </div>
        ) : null}

        {section === "edit" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Edit profile
            </h2>
            <p className="mt-3 text-slate-600">
              Update your display name, phone number and preferred language.
              Email, roles and status are protected.
            </p>
            {profileError ? (
              <div className="mt-6">
                <ErrorMessage message={profileError} title="Update failed" />
              </div>
            ) : null}
            {profileSucceeded ? (
              <div
                className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900"
                role="status"
              >
                Your profile was updated successfully.
              </div>
            ) : null}
            <form
              className="mt-7 max-w-2xl space-y-5"
              noValidate
              onSubmit={(event) =>
                void profileForm.handleSubmit(submitProfile)(event)
              }
            >
              <FormField
                id="profile-name"
                label="Full name"
                autoComplete="name"
                error={profileForm.formState.errors.name?.message}
                {...profileForm.register("name")}
              />
              <FormField
                id="profile-phone"
                label="Phone number"
                type="tel"
                autoComplete="tel"
                error={profileForm.formState.errors.phone?.message}
                {...profileForm.register("phone")}
              />
              <div>
                <label
                  className="mb-2 block text-sm font-semibold text-slate-800"
                  htmlFor="profile-language"
                >
                  Language
                </label>
                <select
                  className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 shadow-sm outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  id="profile-language"
                  {...profileForm.register("language")}
                >
                  {SUPPORTED_LANGUAGES.map((language) => (
                    <option value={language} key={language}>
                      {language === "ja" ? "日本語" : "English"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  className="min-h-12 rounded-xl bg-brand-700 px-6 font-extrabold text-white hover:bg-brand-800 disabled:opacity-60"
                  type="submit"
                  disabled={profileForm.formState.isSubmitting}
                >
                  {profileForm.formState.isSubmitting
                    ? "Saving changes…"
                    : "Save changes"}
                </button>
                <Link
                  className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 px-6 font-bold text-slate-700"
                  to="/profile?section=overview"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        ) : null}

        {section === "security" ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black tracking-tight text-slate-950">
              Change password
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Use at least 12 characters. After a successful change, every
              active session is revoked and you will sign in again.
            </p>
            {passwordError ? (
              <div className="mt-6">
                <ErrorMessage
                  message={passwordError}
                  title="Password change failed"
                />
              </div>
            ) : null}
            <form
              className="mt-7 max-w-2xl space-y-5"
              noValidate
              onSubmit={(event) =>
                void passwordForm.handleSubmit(submitPassword)(event)
              }
            >
              <FormField
                id="current-password"
                label="Current password"
                type="password"
                autoComplete="current-password"
                error={passwordForm.formState.errors.currentPassword?.message}
                {...passwordForm.register("currentPassword")}
              />
              <FormField
                id="new-password"
                label="New password"
                type="password"
                autoComplete="new-password"
                error={passwordForm.formState.errors.newPassword?.message}
                {...passwordForm.register("newPassword")}
              />
              <FormField
                id="confirm-password"
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                error={passwordForm.formState.errors.confirmPassword?.message}
                {...passwordForm.register("confirmPassword")}
              />
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  className="min-h-12 rounded-xl bg-slate-950 px-6 font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                  type="submit"
                  disabled={passwordForm.formState.isSubmitting}
                >
                  {passwordForm.formState.isSubmitting
                    ? "Changing password…"
                    : "Change password"}
                </button>
                <Link
                  className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 px-6 font-bold text-slate-700"
                  to="/profile?section=overview"
                >
                  Cancel
                </Link>
              </div>
            </form>
          </div>
        ) : null}
      </div>

      {confirmSignOut ? (
        <ConfirmationDialog
          title="Sign out of ComfortGo?"
          description="You will need to sign in again to manage your profile, ratings and property listings."
          confirmLabel="Yes, sign out"
          tone="danger"
          isPending={isSigningOut}
          onCancel={() => setConfirmSignOut(false)}
          onConfirm={() => void signOut()}
        />
      ) : null}
    </section>
  );
}
