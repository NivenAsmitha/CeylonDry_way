import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { ConfirmationDialog } from "../../../components/common/ConfirmationDialog";
import { FormField } from "../../../components/common/FormField";
import { LoadingScreen } from "../../../components/common/LoadingScreen";
import { getApiErrorMessage } from "../../../types/api.types";
import {
  USER_MANAGEMENT_QUERY_KEY,
  useManagedUser,
} from "../hooks/useManagedUsers";
import { isTargetVisibleToScope } from "../management-authority";
import * as usersService from "../services/user-management.service";
import type { ManagedProfileInput } from "../types/user-management.types";
import type { RoleName } from "../../auth/types/auth.types";
import { ManagementActionDialog } from "./ManagementActionDialog";
import { UserStatusBadge } from "./UserStatusBadge";

type DialogAction =
  | "suspend"
  | "disable"
  | "change-roles"
  | "soft-delete"
  | "restore"
  | "password-reset"
  | "revoke-sessions";

interface ActionDefinition {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
}

const actionDefinitions: Record<DialogAction, ActionDefinition> = {
  "change-roles": {
    title: "Change account roles",
    description:
      "This replaces the current role set, revokes active sessions and records the reason. Accounts that own property records cannot be converted to another account type.",
    confirmLabel: "Change roles",
    tone: "danger",
  },
  suspend: {
    title: "Suspend account",
    description:
      "The user will be unable to authenticate and all active sessions will be revoked. Listings and operational history remain unchanged.",
    confirmLabel: "Suspend account",
    tone: "danger",
  },
  disable: {
    title: "Disable account",
    description:
      "The account becomes disabled, sessions and unused reset tokens are revoked, and existing records are preserved.",
    confirmLabel: "Disable account",
    tone: "danger",
  },
  "soft-delete": {
    title: "Soft delete account",
    description:
      "This is recoverable. The account is disabled while properties, moderation decisions, roles, and audit history are preserved.",
    confirmLabel: "Soft delete account",
    tone: "danger",
  },
  restore: {
    title: "Restore account",
    description:
      "The account will become active again. Old sessions and password-reset tokens will remain invalid.",
    confirmLabel: "Restore account",
  },
  "password-reset": {
    title: "Initiate password reset",
    description:
      "A one-time reset link will be sent to the account email. You will not see the token or choose the user's password.",
    confirmLabel: "Send reset instructions",
  },
  "revoke-sessions": {
    title: "Revoke sessions",
    description:
      "Every active refresh session will be revoked. Existing access tokens will expire normally unless the account is also suspended or disabled.",
    confirmLabel: "Revoke sessions",
    tone: "danger",
  },
};

function formatDate(value: string | null): string {
  if (!value) return "Not applicable";
  return new Intl.DateTimeFormat("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function actionLabel(action: string): string {
  return action.toLowerCase().replaceAll("_", " ");
}

function summaryText(summary: Record<string, unknown> | null): string | null {
  if (!summary) return null;
  return Object.entries(summary)
    .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
    .join(" · ");
}

interface UserManagementDetailPageProps {
  scope: "admin" | "developer";
}

export function UserManagementDetailPage({
  scope,
}: UserManagementDetailPageProps) {
  const { id = "" } = useParams();
  const queryClient = useQueryClient();
  const userQuery = useManagedUser(id);
  const user = userQuery.data;
  const [dialogAction, setDialogAction] = useState<DialogAction | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingProfile, setPendingProfile] =
    useState<ManagedProfileInput | null>(null);
  const [pendingRoles, setPendingRoles] = useState<RoleName[] | null>(null);
  const profileForm = useForm<ManagedProfileInput>({
    values: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      language: user?.language ?? "en",
    },
  });

  const profileMutation = useMutation({
    mutationFn: (input: ManagedProfileInput) =>
      usersService.updateUser(id, input),
    onSuccess: async (updated) => {
      queryClient.setQueryData(
        [...USER_MANAGEMENT_QUERY_KEY, "detail", id],
        updated,
      );
      await queryClient.invalidateQueries({
        queryKey: [...USER_MANAGEMENT_QUERY_KEY, "list"],
      });
      setSuccess("Profile fields updated and audited.");
    },
  });

  const actionMutation = useMutation<
    unknown,
    unknown,
    { action: DialogAction; reason: string; roles?: RoleName[] }
  >({
    mutationFn: ({ action, reason, roles }) => {
      switch (action) {
        case "change-roles":
          if (!roles) throw new Error("Select a valid role set");
          return usersService.changeRoles(id, roles, reason);
        case "suspend":
          return usersService.changeStatus(id, "SUSPENDED", reason);
        case "disable":
          return usersService.changeStatus(id, "DISABLED", reason);
        case "soft-delete":
          return usersService.softDeleteUser(id, reason);
        case "restore":
          return usersService.restoreUser(id, reason);
        case "password-reset":
          return usersService.initiatePasswordReset(id, reason);
        case "revoke-sessions":
          return usersService.revokeSessions(id, reason);
      }
    },
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: USER_MANAGEMENT_QUERY_KEY,
      });
      setDialogAction(null);
      setPendingRoles(null);
      setSuccess(
        variables.action === "password-reset"
          ? "Password-reset instructions were accepted for delivery. No token or password was exposed."
          : variables.action === "revoke-sessions"
            ? "Sessions revoked and the action was audited."
            : "Account state updated and audited.",
      );
    },
  });

  if (userQuery.isPending) {
    return <LoadingScreen message="Loading user details…" />;
  }
  if (userQuery.isError || !user) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <ErrorMessage
          title="User details could not be loaded"
          message={getApiErrorMessage(userQuery.error)}
        />
      </section>
    );
  }

  if (!isTargetVisibleToScope(scope, user.roles)) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12">
        <ErrorMessage
          title="Account is not manageable"
          message="This account is outside your user-management authority."
        />
      </section>
    );
  }

  const can = (action: (typeof user.allowedActions)[number]) =>
    user.allowedActions.includes(action);
  const definition = dialogAction ? actionDefinitions[dialogAction] : null;
  const roleOptions: Array<{ label: string; roles: RoleName[] }> = [
    { label: "Client", roles: ["CLIENT"] },
    { label: "Client + property owner", roles: ["CLIENT", "OWNER"] },
    { label: "Reviewer", roles: ["REVIEWER"] },
    ...(scope === "developer"
      ? [
          { label: "Administrator", roles: ["ADMIN"] as RoleName[] },
          { label: "Developer", roles: ["DEVELOPER"] as RoleName[] },
        ]
      : []),
  ];
  const currentRoleSignature = user.roles.join("+");
  const selectedRoleSignature = (pendingRoles ?? user.roles).join("+");

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <Link
        className="inline-flex min-h-11 items-center font-bold text-brand-800"
        to={`/${scope}/users`}
      >
        ← Back to users
      </Link>

      <div className="mt-4 flex flex-col gap-5 rounded-3xl bg-slate-950 p-6 text-white sm:p-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-300">
            Account details
          </p>
          <h1 className="mt-2 break-words text-3xl font-black">{user.name}</h1>
          <p className="mt-2 break-all text-slate-300">{user.email}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {user.roles.map((role) => (
              <span
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-black"
                key={role}
              >
                {role}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <UserStatusBadge status={user.status} />
          {user.isDeleted ? (
            <span className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-100">
              Soft-deleted {formatDate(user.deletedAt)}
            </span>
          ) : null}
        </div>
      </div>

      {success ? (
        <div
          className="mt-6 rounded-2xl border border-brand-200 bg-brand-50 p-4 font-semibold text-brand-950"
          role="status"
        >
          {success}
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black">Safe profile fields</h2>
            <p className="mt-2 text-sm text-slate-600">
              Email, password, roles, and status are managed through separate
              protected actions.
            </p>
            <form
              className="mt-6 space-y-5"
              onSubmit={profileForm.handleSubmit((values) =>
                setPendingProfile({
                  name: values.name?.trim(),
                  phone: values.phone?.trim() || null,
                  language: values.language,
                }),
              )}
            >
              <FormField
                id="managed-name"
                label="Name"
                minLength={2}
                maxLength={100}
                required
                {...profileForm.register("name", {
                  required: "Name is required",
                  minLength: { value: 2, message: "Use at least 2 characters" },
                })}
                error={profileForm.formState.errors.name?.message}
              />
              <FormField
                id="managed-phone"
                label="Phone"
                maxLength={30}
                {...profileForm.register("phone")}
              />
              <label
                className="block text-sm font-semibold"
                htmlFor="managed-language"
              >
                Language
                <select
                  className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"
                  id="managed-language"
                  {...profileForm.register("language")}
                >
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </label>
              {profileMutation.isError ? (
                <ErrorMessage
                  message={getApiErrorMessage(profileMutation.error)}
                />
              ) : null}
              <button
                className="min-h-12 rounded-xl bg-brand-700 px-6 font-black text-white disabled:opacity-50"
                type="submit"
                disabled={profileMutation.isPending || !can("EDIT_PROFILE")}
              >
                {profileMutation.isPending ? "Saving…" : "Save profile"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-2xl font-black">Account history</h2>
            {user.auditHistory.length ? (
              <ol className="mt-5 space-y-4">
                {user.auditHistory.map((event) => (
                  <li
                    className="border-l-2 border-brand-200 pl-4"
                    key={event.id}
                  >
                    <p className="font-black capitalize">
                      {actionLabel(event.action)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(event.createdAt)} · by {event.actorName}
                    </p>
                    {summaryText(event.after) ? (
                      <p className="mt-2 break-words text-sm text-slate-600">
                        {summaryText(event.after)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="mt-4 text-slate-600">
                No account-management history yet.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Activity summary</h2>
            <dl className="mt-5 grid grid-cols-2 gap-4">
              {[
                ["Active sessions", user.activity.activeSessionCount],
                ["Properties", user.activity.propertiesOwned],
                ["Review decisions", user.activity.reviewDecisions],
                ["Status changed", formatDate(user.statusChangedAt)],
              ].map(([label, value]) => (
                <div className="rounded-2xl bg-slate-50 p-4" key={label}>
                  <dt className="text-xs font-bold uppercase text-slate-500">
                    {label}
                  </dt>
                  <dd className="mt-1 break-words font-black text-slate-950">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Role assignment history</h2>
            <ul className="mt-4 space-y-3">
              {user.roleHistory.map((assignment) => (
                <li
                  className="rounded-2xl bg-slate-50 p-4"
                  key={assignment.role}
                >
                  <p className="font-black">{assignment.role}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(assignment.assignedAt)} ·{" "}
                    {assignment.assignedByName ?? "System"}
                  </p>
                  {assignment.systemReason ? (
                    <p className="mt-1 text-xs text-slate-600">
                      {assignment.systemReason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Account actions</h2>
            <p className="mt-2 text-sm text-slate-600">
              Every completed action requires a reason and creates an audit
              record.
            </p>
            <div className="mt-5 grid gap-3">
              {can("CHANGE_ROLES") && !user.isDeleted ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label
                    className="text-sm font-bold"
                    htmlFor="managed-role-set"
                  >
                    Account role set
                  </label>
                  <select
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
                    id="managed-role-set"
                    value={selectedRoleSignature}
                    onChange={(event) => {
                      const option = roleOptions.find(
                        ({ roles }) => roles.join("+") === event.target.value,
                      );
                      setPendingRoles(option?.roles ?? null);
                    }}
                  >
                    {roleOptions.map((option) => (
                      <option
                        key={option.roles.join("+")}
                        value={option.roles.join("+")}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 font-bold disabled:opacity-50"
                    type="button"
                    disabled={
                      !pendingRoles ||
                      selectedRoleSignature === currentRoleSignature
                    }
                    onClick={() => setDialogAction("change-roles")}
                  >
                    Review role change
                  </button>
                </div>
              ) : null}
              {can("CHANGE_STATUS") && user.status === "ACTIVE" ? (
                <button
                  className="min-h-11 rounded-xl border border-amber-300 bg-amber-50 px-4 font-bold text-amber-950"
                  type="button"
                  onClick={() => setDialogAction("suspend")}
                >
                  Suspend account
                </button>
              ) : null}
              {can("CHANGE_STATUS") && user.status !== "DISABLED" ? (
                <button
                  className="min-h-11 rounded-xl border border-red-300 bg-red-50 px-4 font-bold text-red-800"
                  type="button"
                  onClick={() => setDialogAction("disable")}
                >
                  Disable account
                </button>
              ) : null}
              {can("RESTORE") ? (
                <button
                  className="min-h-11 rounded-xl bg-brand-700 px-4 font-bold text-white"
                  type="button"
                  onClick={() => setDialogAction("restore")}
                >
                  Restore account
                </button>
              ) : null}
              {can("INITIATE_PASSWORD_RESET") ? (
                <button
                  className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold"
                  type="button"
                  onClick={() => setDialogAction("password-reset")}
                >
                  Initiate password reset
                </button>
              ) : null}
              {can("REVOKE_SESSIONS") ? (
                <button
                  className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold"
                  type="button"
                  onClick={() => setDialogAction("revoke-sessions")}
                >
                  Revoke sessions
                </button>
              ) : null}
              {can("SOFT_DELETE") ? (
                <button
                  className="min-h-11 rounded-xl bg-red-800 px-4 font-bold text-white"
                  type="button"
                  onClick={() => setDialogAction("soft-delete")}
                >
                  Soft delete account
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>

      {dialogAction && definition ? (
        <ManagementActionDialog
          key={dialogAction}
          {...definition}
          isPending={actionMutation.isPending}
          error={
            actionMutation.isError
              ? getApiErrorMessage(actionMutation.error)
              : null
          }
          onCancel={() => {
            if (!actionMutation.isPending) {
              actionMutation.reset();
              setDialogAction(null);
            }
          }}
          onConfirm={(reason) =>
            actionMutation.mutate({
              action: dialogAction,
              reason,
              ...(dialogAction === "change-roles" && pendingRoles
                ? { roles: pendingRoles }
                : {}),
            })
          }
        />
      ) : null}

      {pendingProfile ? (
        <ConfirmationDialog
          title="Save these user details?"
          description="The user’s safe profile fields will be updated and the change will be recorded in the audit history."
          confirmLabel="Save user details"
          isPending={profileMutation.isPending}
          details={
            <dl className="space-y-2">
              <div>
                <dt className="font-bold text-slate-950">Name</dt>
                <dd>{pendingProfile.name}</dd>
              </div>
              <div>
                <dt className="font-bold text-slate-950">Phone</dt>
                <dd>{pendingProfile.phone || "Not provided"}</dd>
              </div>
            </dl>
          }
          onCancel={() => setPendingProfile(null)}
          onConfirm={() =>
            profileMutation.mutate(pendingProfile, {
              onSuccess: () => setPendingProfile(null),
            })
          }
        />
      ) : null}
    </section>
  );
}
