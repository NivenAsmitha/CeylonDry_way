import { PROPERTY_FORM_STEPS } from "../property.constants";

interface PropertyStepIndicatorProps {
  currentStep: number;
  onSelect: (step: number) => void;
  visitedStep: number;
}

export function PropertyStepIndicator({
  currentStep,
  onSelect,
  visitedStep,
}: PropertyStepIndicatorProps) {
  return (
    <nav aria-label="Property form progress">
      <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {PROPERTY_FORM_STEPS.map((label, index) => {
          const step = index + 1;
          const active = currentStep === step;
          const available = step <= visitedStep;

          return (
            <li key={label}>
              <button
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                  active
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : available
                      ? "border-emerald-200 bg-emerald-50 text-emerald-950 hover:border-emerald-400"
                      : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                }`}
                type="button"
                disabled={!available}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step)}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${
                    active ? "bg-white text-emerald-800" : "bg-white"
                  }`}
                >
                  {step}
                </span>
                <span>{label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
