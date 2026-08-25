import type { UserStatus } from "../../auth/types/auth.types";

const statusStyles: Record<UserStatus, string> = {
  ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-800",
  SUSPENDED: "border-amber-200 bg-amber-50 text-amber-900",
  DISABLED: "border-slate-300 bg-slate-100 text-slate-700",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${statusStyles[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}
