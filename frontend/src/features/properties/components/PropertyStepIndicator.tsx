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
            <li className="h-full" key={label}>
              <button
                className={`flex h-full min-h-16 w-full items-center gap-3 rounded-xl border px-3 py-3 text-left text-xs font-bold leading-5 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 ${
                  active
                    ? "border-brand-700 bg-brand-700 text-white"
                    : available
                      ? "border-brand-200 bg-brand-50 text-brand-950 hover:border-brand-400"
                      : "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
                }`}
                type="button"
                disabled={!available}
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(step)}
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${
                    active ? "bg-white text-brand-800" : "bg-white"
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
