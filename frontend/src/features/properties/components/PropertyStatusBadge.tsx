import type { PropertyStatus } from "../types/property.types";
import { getPropertyStatusLabel } from "../property.constants";

const statusStyles: Record<PropertyStatus, string> = {
  DRAFT: "border-slate-300 bg-slate-100 text-slate-800",
  PENDING: "border-amber-300 bg-amber-50 text-amber-900",
  CHANGES_REQUESTED: "border-orange-300 bg-orange-50 text-orange-900",
  APPROVED: "border-green-300 bg-green-50 text-green-900",
  PENDING_UPDATE: "border-brand-300 bg-brand-50 text-brand-900",
  UPDATE_CHANGES_REQUESTED: "border-orange-300 bg-orange-50 text-orange-900",
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
