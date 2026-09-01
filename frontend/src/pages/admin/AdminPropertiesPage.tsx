import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import {
  type AdminPropertyAction,
} from "../../features/admin-properties/admin-properties.service";
import {
  useAdminProperties,
  useAdminPropertyAction,
} from "../../features/admin-properties/useAdminProperties";
import { PropertyStatusBadge } from "../../features/properties/components/PropertyStatusBadge";
import {
  PROPERTY_STATUSES,
  type PropertyStatus,
} from "../../features/properties/types/property.types";
import { getApiErrorMessage } from "../../types/api.types";

const actionLabels: Record<AdminPropertyAction, string> = {
  SUSPEND: "Suspend listing",
  REACTIVATE: "Reactivate listing",
  ARCHIVE: "Archive listing",
};

export function AdminPropertiesPage() {
  const [params, setParams] = useSearchParams();
  const statusValue = params.get("status");
  const status = PROPERTY_STATUSES.find((value) => value === statusValue) as
    | PropertyStatus
    | undefined;
  const search = params.get("search") ?? "";
  const properties = useAdminProperties({ search: search || undefined, status });
  const actionMutation = useAdminPropertyAction();
  const [pendingAction, setPendingAction] = useState<{
    propertyId: string;
    propertyName: string;
    action: AdminPropertyAction;
  } | null>(null);
  const [reason, setReason] = useState("");

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    const next = new URLSearchParams(params);
    if (value) next.set("search", value);
    else next.delete("search");
    setParams(next);
  }

  async function confirmAction(): Promise<void> {
    if (!pendingAction || reason.trim().length < 10) return;
    await actionMutation.mutateAsync({ ...pendingAction, reason: reason.trim() });
    setPendingAction(null);
    setReason("");
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">Admin workspace</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Property management</h1>
        <p className="mt-2 max-w-2xl text-slate-600">
          Monitor every property lifecycle and apply audited suspension,
          reactivation, or archive actions.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
          <input className="min-h-12 flex-1 rounded-xl border border-slate-300 px-4" name="search" defaultValue={search} placeholder="Search property, owner, city, or district" aria-label="Search properties" />
          <button className="min-h-12 rounded-xl bg-slate-950 px-6 font-bold text-white" type="submit">Search</button>
          <select
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4"
            value={status ?? ""}
            aria-label="Filter by status"
            onChange={(event) => {
              const next = new URLSearchParams(params);
              if (event.target.value) next.set("status", event.target.value);
              else next.delete("status");
              setParams(next);
            }}
          >
            <option value="">All statuses</option>
            {PROPERTY_STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
          </select>
        </form>
      </div>

      {properties.isPending ? <LoadingScreen message="Loading properties..." /> : null}
      {properties.isError ? <div className="mt-8"><ErrorMessage title="Properties could not be loaded" message={getApiErrorMessage(properties.error)} /></div> : null}

      {properties.data ? (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-5 py-4">Property</th><th className="px-5 py-4">Owner</th><th className="px-5 py-4">Location</th><th className="px-5 py-4">Photos</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {properties.data.items.map((property) => (
                <tr key={property.id} className="align-top">
                  <td className="px-5 py-4"><p className="font-black text-slate-950">{property.activeVersion?.name || "Untitled property"}</p><p className="mt-1 text-xs text-slate-500">{property.activeVersion?.propertyType?.replaceAll("_", " ") || "Type not set"}</p></td>
                  <td className="px-5 py-4"><p className="font-bold">{property.owner.name}</p><p className="mt-1 text-slate-500">{property.owner.email}</p></td>
                  <td className="px-5 py-4 text-slate-600">{[property.activeVersion?.city, property.activeVersion?.district].filter(Boolean).join(", ") || "Not provided"}</td>
                  <td className="px-5 py-4 font-bold">{property.activeVersion?.photoCount ?? 0}</td>
                  <td className="px-5 py-4"><PropertyStatusBadge status={property.lifecycleStatus} /></td>
                  <td className="px-5 py-4"><div className="flex justify-end gap-2">{property.allowedActions.map((action) => (
                    <button key={action} className={`min-h-10 rounded-lg border px-3 text-xs font-bold ${action === "ARCHIVE" ? "border-red-200 text-red-700" : "border-slate-300 text-slate-700"}`} type="button" onClick={() => { setPendingAction({ propertyId: property.id, propertyName: property.activeVersion?.name || "Untitled property", action }); setReason(""); }}>{actionLabels[action]}</button>
                  ))}</div></td>
                </tr>
              ))}
            </tbody>
          </table>
          {properties.data.items.length === 0 ? <p className="p-10 text-center text-slate-600">No properties match these filters.</p> : null}
        </div>
      ) : null}

      {pendingAction ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPendingAction(null); }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="property-action-title">
            <h2 className="text-xl font-black" id="property-action-title">{actionLabels[pendingAction.action]}</h2>
            <p className="mt-2 text-sm text-slate-600">{pendingAction.propertyName}. This action is recorded in the audit history.</p>
            {actionMutation.isError ? <div className="mt-5"><ErrorMessage message={getApiErrorMessage(actionMutation.error)} /></div> : null}
            <label className="mt-5 block text-sm font-bold" htmlFor="property-action-reason">Reason</label>
            <textarea id="property-action-reason" className="mt-2 min-h-32 w-full rounded-xl border border-slate-300 px-4 py-3" maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
            <p className="mt-2 text-xs text-slate-500">Enter at least 10 characters.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="min-h-11 rounded-xl border border-slate-300 px-4 font-bold" type="button" onClick={() => setPendingAction(null)}>Cancel</button>
              <button className="min-h-11 rounded-xl bg-slate-950 px-5 font-bold text-white disabled:opacity-50" type="button" disabled={reason.trim().length < 10 || actionMutation.isPending} onClick={() => void confirmAction()}>{actionMutation.isPending ? "Applying..." : "Confirm action"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
