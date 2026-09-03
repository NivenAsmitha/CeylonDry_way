import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { ManagementActionDialog } from "../../features/user-management/components/ManagementActionDialog";
import {
  ACCESS_MANAGEMENT_QUERY_KEY,
  useAccessManagement,
} from "../../features/access-management/useAccessManagement";
import { updateRolePermissions } from "../../features/access-management/access-management.service";
import type {
  PermissionDefinition,
  RoleAccess,
} from "../../features/access-management/access-management.types";
import type { PermissionKey } from "../../features/auth/types/auth.types";
import { getApiErrorMessage } from "../../types/api.types";

function RoleAccessCard({
  assignment,
  catalog,
}: {
  assignment: RoleAccess;
  catalog: PermissionDefinition[];
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<PermissionKey[]>(
    assignment.permissions,
  );
  const [confirming, setConfirming] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (reason: string) =>
      updateRolePermissions(assignment.role, selected, reason),
    onSuccess: (matrix) => {
      queryClient.setQueryData(ACCESS_MANAGEMENT_QUERY_KEY, matrix);
      setConfirming(false);
      setSuccess(
        `${assignment.role} permissions updated. Active sessions for this role were revoked.`,
      );
    },
  });

  const changed =
    selected.join("+") !== assignment.permissions.join("+");
  const granted = selected.filter(
    (permission) => !assignment.permissions.includes(permission),
  );
  const revoked = assignment.permissions.filter(
    (permission) => !selected.includes(permission),
  );

  function toggle(permission: PermissionKey, checked: boolean): void {
    setSuccess(null);
    setSelected((current) =>
      catalog
        .map(({ key }) => key)
        .filter((key) =>
          key === permission
            ? checked
            : current.includes(key),
        ),
    );
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
            Staff role
          </p>
          <h2 className="mt-1 text-2xl font-black text-slate-950">
            {assignment.role === "ADMIN" ? "Administrator" : "Reviewer"}
          </h2>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-black text-brand-900">
          {selected.length} enabled
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {catalog.map((permission) => {
          const available = permission.availableTo.includes(assignment.role);
          const checked = selected.includes(permission.key);
          return (
            <label
              className={`flex items-start gap-3 rounded-2xl border p-4 ${
                available
                  ? "cursor-pointer border-slate-200 hover:border-brand-200"
                  : "cursor-not-allowed border-slate-100 bg-slate-50 opacity-55"
              } ${checked ? "bg-brand-50/60" : "bg-white"}`}
              key={permission.key}
            >
              <input
                className="mt-0.5 size-5 shrink-0 accent-brand-700"
                type="checkbox"
                checked={checked}
                disabled={!available}
                onChange={(event) =>
                  toggle(permission.key, event.target.checked)
                }
              />
              <span>
                <span className="block text-sm font-black text-slate-950">
                  {permission.name}
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-600">
                  {permission.description}
                </span>
                {!available ? (
                  <span className="mt-1 block text-xs font-bold text-slate-500">
                    Available only to {assignment.role === "ADMIN" ? "Reviewer" : "Administrator"} accounts
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>

      {success ? (
        <p className="mt-5 rounded-xl bg-brand-50 p-3 text-sm font-semibold text-brand-950" role="status">
          {success}
        </p>
      ) : null}
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40"
          type="button"
          disabled={!changed || mutation.isPending}
          onClick={() => setSelected(assignment.permissions)}
        >
          Reset
        </button>
        <button
          className="min-h-11 rounded-xl bg-slate-950 px-5 font-black text-white disabled:opacity-40"
          type="button"
          disabled={!changed || mutation.isPending}
          onClick={() => setConfirming(true)}
        >
          Review changes
        </button>
      </div>

      {confirming ? (
        <ManagementActionDialog
          title={`Update ${assignment.role.toLowerCase()} access?`}
          description="This changes access for every active account with this role. Their active sessions will be revoked so the new permissions apply on the next sign-in."
          confirmLabel="Apply permission changes"
          tone="danger"
          isPending={mutation.isPending}
          error={mutation.isError ? getApiErrorMessage(mutation.error) : null}
          details={
            <div className="space-y-2">
              <p><strong>Grant:</strong> {granted.length ? granted.join(", ") : "None"}</p>
              <p><strong>Revoke:</strong> {revoked.length ? revoked.join(", ") : "None"}</p>
            </div>
          }
          onCancel={() => {
            if (!mutation.isPending) {
              mutation.reset();
              setConfirming(false);
            }
          }}
          onConfirm={(reason) => mutation.mutate(reason)}
        />
      ) : null}
    </article>
  );
}

export function DeveloperAccessManagementPage() {
  const access = useAccessManagement();

  if (access.isPending) {
    return <LoadingScreen message="Loading access management…" />;
  }
  if (access.isError || !access.data) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-12">
        <ErrorMessage
          title="Access settings could not be loaded"
          message={getApiErrorMessage(access.error)}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
          Developer workspace
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          Access management
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600">
          Control which operational areas Administrator and Reviewer accounts
          can use. These permissions apply to the whole role, not to one user.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sm leading-6 text-sky-950">
        <p className="font-black">Developer access is protected</p>
        <p className="mt-1">
          Developers retain system operations and Access Management authority.
          This page cannot remove its own control permission.
        </p>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        {access.data.roles.map((assignment) => (
          <RoleAccessCard
            key={`${assignment.role}:${assignment.permissions.join("+")}`}
            assignment={assignment}
            catalog={access.data.permissions}
          />
        ))}
      </div>
    </section>
  );
}
