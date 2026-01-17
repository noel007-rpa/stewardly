import type { DistributionPlan } from "../../types/distribution";

type ActiveDistributionPlanCardProps = {
  plan: DistributionPlan;
  isLockedContext: boolean;
  onEdit?: () => void;
  onDuplicate?: () => void;
};

function getTotalPercentage(plan: DistributionPlan): number {
  return plan.targets.reduce((sum, t) => sum + t.targetPct, 0);
}

function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
    }).format(date);
  } catch {
    return isoString;
  }
}

export function ActiveDistributionPlanCard({
  plan,
  isLockedContext,
  onEdit,
  onDuplicate,
}: ActiveDistributionPlanCardProps) {
  const total = getTotalPercentage(plan);
  const isComplete = total === 100;

  return (
    <div className="rounded-lg border-2 border-emerald-200 bg-white overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-emerald-100 bg-emerald-50">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                ✓ Active
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-2">
              Your active distribution plan defines how income is allocated
            </p>
          </div>
        </div>
      </div>

      {/* Lock Warning */}
      {isLockedContext && (
        <div className="mx-6 mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <svg
            className="h-5 w-5 text-amber-600 shrink-0 mt-0.5"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-semibold text-amber-900 text-sm">Period is locked</p>
            <p className="text-xs text-amber-800 mt-0.5">
              This period is locked, which means the plan used for allocation is frozen for this period.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-6 py-4 space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Currency
            </div>
            <div className="text-lg font-semibold text-slate-900 mt-1">{plan.currency}</div>
          </div>

          <div className="rounded-lg bg-slate-50 px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Categories
            </div>
            <div className="text-lg font-semibold text-slate-900 mt-1">
              {plan.targets.length}
            </div>
          </div>

          <div
            className={`rounded-lg px-4 py-3 ${
              isComplete ? "bg-emerald-50" : "bg-amber-50"
            }`}
          >
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Allocation
            </div>
            <div
              className={`text-lg font-semibold mt-1 ${
                isComplete ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {total}%
            </div>
          </div>
        </div>

        {/* Validation Warning */}
        {!isComplete && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-medium text-amber-900">
              ⚠ Incomplete allocation
            </p>
            <p className="text-xs text-amber-800 mt-1">
              Your distribution plan totals {total}% instead of 100%. Update category percentages to resolve this.
            </p>
          </div>
        )}

        {/* Categories Table */}
        <div className="overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-8">Category</div>
            <div className="col-span-4 text-right">Target %</div>
          </div>

          <div className="divide-y divide-slate-200">
            {plan.targets.map((target) => (
              <div
                key={target.category}
                className="grid grid-cols-12 gap-2 px-4 py-3 items-center hover:bg-slate-50 transition-colors"
              >
                <div className="col-span-8">
                  <span className="text-sm font-medium text-slate-900">
                    {target.category}
                  </span>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-sm font-semibold text-slate-900">
                    {target.targetPct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="text-xs text-slate-500">
          Updated {formatDate(plan.updatedAt)}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <button
          onClick={onEdit}
          disabled={!onEdit}
          className={`flex-1 rounded-lg font-semibold py-2 px-4 text-sm transition-colors ${
            onEdit
              ? "bg-slate-900 hover:bg-slate-800 text-white"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          Edit Plan
        </button>

        <button
          onClick={onDuplicate}
          disabled={!onDuplicate}
          className={`flex-1 rounded-lg font-semibold py-2 px-4 text-sm transition-colors ${
            onDuplicate
              ? "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              : "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
          }`}
        >
          Duplicate Plan
        </button>
      </div>
    </div>
  );
}
