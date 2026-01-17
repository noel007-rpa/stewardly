type EmptyDistributionPlansProps = {
  onCreatePlan: () => void;
};

export function EmptyDistributionPlans({ onCreatePlan }: EmptyDistributionPlansProps) {
  return (
    <div className="flex items-center justify-center min-h-96 px-4">
      <div className="w-full max-w-md rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-8 py-12 text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-slate-200 p-3">
            <svg
              className="h-8 w-8 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          No distribution plans yet
        </h3>

        {/* Description */}
        <p className="text-slate-600 text-sm mb-6 leading-relaxed">
          Distribution plans define how your income is allocated across spending categories like groceries, entertainment, and utilities. Create a plan to get started.
        </p>

        {/* Button */}
        <button
          onClick={onCreatePlan}
          className="w-full inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-semibold transition-colors"
        >
          <span>+</span>
          <span>Create your first plan</span>
        </button>

        {/* Helper text */}
        <p className="text-xs text-slate-500 mt-4">
          You can create multiple plans and switch between them anytime.
        </p>
      </div>
    </div>
  );
}
