import { PropertyForm } from "../../features/properties/components/PropertyForm";

export function ListPropertyPage() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-brand-700">
          Property owner workflow
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          List your property
        </h1>
        <p className="mt-3 text-slate-600">
          Build a review-ready listing one section at a time. Your first save
          creates a private draft and enables your owner workspace.
        </p>
      </div>
      <div className="mt-8">
        <PropertyForm />
      </div>
    </section>
  );
}
