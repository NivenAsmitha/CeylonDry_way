import { Link, useParams } from "react-router-dom";
import { ErrorMessage } from "../../components/common/ErrorMessage";
import { LoadingScreen } from "../../components/common/LoadingScreen";
import { PropertyForm } from "../../features/properties/components/PropertyForm";
import { useOwnerProperty } from "../../features/properties/hooks/useOwnerProperties";
import { getApiErrorMessage } from "../../types/api.types";

export function ReviewerEditPropertyPage() {
  const { id } = useParams();
  const property = useOwnerProperty(id, "reviewer");

  if (property.isPending) {
    return <LoadingScreen message="Loading reviewer property draft..." />;
  }
  if (property.isError || !property.data) {
    return (
      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <ErrorMessage
          title="Property unavailable"
          message={getApiErrorMessage(property.error)}
        />
        <Link
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-brand-700 px-5 font-bold text-white"
          to="/reviewer/properties"
        >
          Return to manually added properties
        </Link>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
            Reviewer workspace
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            {property.data.canEdit ? "Edit manual property" : "View manual property"}
          </h1>
        </div>
        <Link
          className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 font-bold text-slate-800"
          to="/reviewer/properties"
        >
          Manually added properties
        </Link>
      </div>
      <div className="mt-8">
        <PropertyForm property={property.data} workflow="reviewer" />
      </div>
    </section>
  );
}
