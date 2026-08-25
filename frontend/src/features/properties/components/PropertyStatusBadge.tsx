import type { PropertyStatus } from "../types/property.types";
import { getPropertyStatusLabel } from "../property.constants";

const statusStyles: Record<PropertyStatus, string> = {
  DRAFT: "border-slate-300 bg-slate-100 text-slate-800",
  PENDING: "border-amber-300 bg-amber-50 text-amber-900",
  CHANGES_REQUESTED: "border-orange-300 bg-orange-50 text-orange-900",
  APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-900",
  PENDING_UPDATE: "border-sky-300 bg-sky-50 text-sky-900",
  REJECTED: "border-red-300 bg-red-50 text-red-900",
  SUSPENDED: "border-red-300 bg-red-50 text-red-900",
  ARCHIVED: "border-slate-300 bg-slate-100 text-slate-700",
};

export function PropertyStatusBadge({ status }: { status: PropertyStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${statusStyles[status]}`}
    >
      <span className="size-2 rounded-full bg-current" aria-hidden="true" />
      {getPropertyStatusLabel(status)}
    </span>
  );
}
