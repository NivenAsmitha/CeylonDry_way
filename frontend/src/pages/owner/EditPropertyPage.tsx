import { Link, useParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { PropertyForm } from "../../features/properties/components/PropertyForm";
import { useOwnerProperty } from "../../features/properties/hooks/useOwnerProperties";
import { getApiErrorMessage } from "../../types/api.types";

export function EditPropertyPage() {
  const { id } = useParams();
  const propertyQuery = useOwnerProperty(id);

  if (propertyQuery.isPending) {
    return <LoadingScreen message="Loading your property draft..." />;
  }

  if (propertyQuery.isError || !propertyQuery.data) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <ErrorMessage
          title="Property unavailable"
          message={getApiErrorMessage(propertyQuery.error)}
        />
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-5 font-bold text-white"
          to="/owner/properties"
        >
          Return to my properties
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
            Owner workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {propertyQuery.data.canEdit ? "Edit property" : "View property"}
          </h1>
        </div>
        <Link
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-800 transition hover:border-brand-300 hover:text-brand-800"
          to="/owner/properties"
        >
          My properties
        </Link>
      </div>
      <div className="mt-8">
        <PropertyForm property={propertyQuery.data} />
      </div>
    </section>
  );
}
