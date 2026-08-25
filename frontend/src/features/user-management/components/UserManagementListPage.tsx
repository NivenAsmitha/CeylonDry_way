import { type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../../components/common/ErrorMessage";
import { LoadingScreen } from "../../../components/common/LoadingScreen";
import {
  ROLE_NAMES,
  USER_STATUSES,
  type RoleName,
  type UserStatus,
} from "../../auth/types/auth.types";
import { getApiErrorMessage } from "../../../types/api.types";
import { useManagedUsers } from "../hooks/useManagedUsers";
import {
  USER_SORT_VALUES,
  type UserListQuery,
  type UserSort,
} from "../types/user-management.types";
import { UserStatusBadge } from "./UserStatusBadge";

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function enumValue<T extends readonly string[]>(
  values: T,
  value: string | null,
): T[number] | undefined {
  return values.find((candidate) => candidate === value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-LK", { dateStyle: "medium" }).format(
    new Date(value),
  );
}

const sortLabels: Record<UserSort, string> = {
  created_desc: "Newest first",
  created_asc: "Oldest first",
  name_asc: "Name A–Z",
  name_desc: "Name Z–A",
  email_asc: "Email A–Z",
  status_asc: "Status",
};

interface UserManagementListPageProps {
  scope: "admin" | "developer";
}

export function UserManagementListPage({ scope }: UserManagementListPageProps) {
  const [params, setParams] = useSearchParams();
  const query: UserListQuery = {
    search: params.get("search") ?? undefined,
    role: enumValue(ROLE_NAMES, params.get("role")) as RoleName | undefined,
    status: enumValue(USER_STATUSES, params.get("status")) as
      UserStatus | undefined,
    includeDeleted: params.get("includeDeleted") === "true",
    page: positiveInteger(params.get("page"), 1),
    pageSize: 20,
    sort:
      (enumValue(USER_SORT_VALUES, params.get("sort")) as
        UserSort | undefined) ?? "created_desc",
  };
  const users = useManagedUsers(query);
  const basePath = `/${scope}/users`;

  function updateFilter(key: string, value: string): void {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set("page", "1");
    setParams(next);
  }

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    updateFilter("search", String(data.get("search") ?? "").trim());
  }

  function changePage(page: number): void {
    const next = new URLSearchParams(params);
    next.set("page", String(page));
    setParams(next);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            {scope === "admin" ? "Admin workspace" : "Developer workspace"}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            User management
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Find accounts, review safe activity, and apply audited account
            actions within your authority.
          </p>
        </div>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-700 px-5 font-bold text-emerald-800"
          to={scope === "admin" ? "/admin/reviewers" : "/developer/admins"}
        >
          {scope === "admin" ? "Create reviewer" : "Create admin"}
        </Link>
      </div>

      <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={submitSearch}
        >
          <label className="sr-only" htmlFor="user-search">
            Search by name or email
          </label>
          <input
            className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            defaultValue={query.search ?? ""}
            id="user-search"
            name="search"
            maxLength={100}
            placeholder="Search name or email"
          />
          <button
            className="min-h-12 rounded-xl bg-slate-950 px-6 font-black text-white"
            type="submit"
          >
            Search
          </button>
        </form>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-bold">
            <span className="mb-2 block">Role</span>
            <select
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
              value={query.role ?? ""}
              onChange={(event) => updateFilter("role", event.target.value)}
            >
              <option value="">All roles</option>
              {ROLE_NAMES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            <span className="mb-2 block">Status</span>
            <select
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
              value={query.status ?? ""}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">All statuses</option>
              {USER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            <span className="mb-2 block">Sort</span>
            <select
              className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3"
              value={query.sort}
              onChange={(event) => updateFilter("sort", event.target.value)}
            >
              {USER_SORT_VALUES.map((sort) => (
                <option key={sort} value={sort}>
                  {sortLabels[sort]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-end gap-3 pb-2 text-sm font-bold">
            <input
              className="size-5 accent-emerald-700"
              type="checkbox"
              checked={query.includeDeleted}
              onChange={(event) =>
                updateFilter("includeDeleted", String(event.target.checked))
              }
            />
            Include soft-deleted
          </label>
        </div>
      </div>

      {users.isPending ? (
        <div className="mt-8">
          <LoadingScreen message="Loading users…" />
        </div>
      ) : null}
      {users.isError ? (
        <div className="mt-8">
          <ErrorMessage
            title="Users could not be loaded"
            message={getApiErrorMessage(users.error)}
          />
        </div>
      ) : null}
      {users.data?.items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="text-xl font-black">No matching users</h2>
          <p className="mt-2 text-slate-600">
            Try clearing one of the filters.
          </p>
        </div>
      ) : null}

      {users.data?.items.length ? (
        <div className="mt-8 overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-[760px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Roles</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {users.data.items.map((user) => (
                <tr key={user.id} className="align-top">
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-950">{user.name}</p>
                    <p className="mt-1 text-slate-600">{user.email}</p>
                    {user.isDeleted ? (
                      <p className="mt-1 text-xs font-bold text-red-700">
                        Soft-deleted
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {user.roles.map((role) => (
                        <span
                          className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold"
                          key={role}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <UserStatusBadge status={user.status} />
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {formatDate(user.createdAt)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      className="inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 font-bold text-white"
                      to={`${basePath}/${user.id}`}
                    >
                      View details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {users.data ? (
        <nav
          className="mt-6 flex items-center justify-between gap-4"
          aria-label="User list pagination"
        >
          <button
            className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40"
            type="button"
            disabled={query.page <= 1}
            onClick={() => changePage(query.page - 1)}
          >
            Previous
          </button>
          <p className="text-center text-sm font-semibold text-slate-600">
            Page {users.data.pagination.page} of{" "}
            {users.data.pagination.totalPages} ·{" "}
            {users.data.pagination.totalItems} users
          </p>
          <button
            className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold disabled:opacity-40"
            type="button"
            disabled={query.page >= users.data.pagination.totalPages}
            onClick={() => changePage(query.page + 1)}
          >
            Next
          </button>
        </nav>
      ) : null}
    </section>
  );
}
