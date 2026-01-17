import { useState } from "react";
import type { DistributionPlan } from "../../types/distribution";
import { deletePlan } from "../../state/distributionPlansStore";

type InactiveDistributionPlansProps = {
  plans: DistributionPlan[];
  onView?: (plan: DistributionPlan) => void;
  onDuplicate?: (plan: DistributionPlan) => void;
  onActivate?: (plan: DistributionPlan) => void;
};

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

function PlanRow({
  plan,
  onView,
  onDuplicate,
  onActivate,
}: {
  plan: DistributionPlan;
  onView?: (plan: DistributionPlan) => void;
  onDuplicate?: (plan: DistributionPlan) => void;
  onActivate?: (plan: DistributionPlan) => void;
}) {
  const canDelete = !plan.hasSnapshots;

  return (
    <div className="grid grid-cols-12 gap-4 items-center px-4 py-4 border-b border-slate-200 last:border-b-0 hover:bg-slate-50 transition-colors">
      {/* Name and Currency */}
      <div className="col-span-4">
        <div className="font-medium text-slate-900">{plan.name}</div>
        <div className="text-xs text-slate-500 mt-1">{plan.currency}</div>
      </div>

      {/* Created Date */}
      <div className="col-span-2">
        <div className="text-sm text-slate-600">{formatDate(plan.updatedAt)}</div>
      </div>

      {/* Status Badge */}
      <div className="col-span-2">
        <span className="inline-flex items-center rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
          Inactive
        </span>
      </div>

      {/* Actions */}
      <div className="col-span-4 flex justify-end gap-2">
        <button
          onClick={() => onView?.(plan)}
          disabled={!onView}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            onView
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
              : "bg-slate-50 text-slate-400 cursor-not-allowed"
          }`}
        >
          View
        </button>

        <button
          onClick={() => onActivate?.(plan)}
          disabled={!onActivate}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            onActivate
              ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
              : "bg-emerald-50 text-emerald-400 cursor-not-allowed"
          }`}
        >
          Activate
        </button>

        <button
          onClick={() => onDuplicate?.(plan)}
          disabled={!onDuplicate}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            onDuplicate
              ? "border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
              : "border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
          }`}
        >
          Duplicate
        </button>

        {canDelete && (
          <button
            onClick={() => {
              if (confirm(`Delete plan "${plan.name}"?`)) {
                deletePlan(plan.id);
              }
            }}
            className="px-3 py-1.5 text-xs font-medium rounded border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
          >
            Delete
          </button>
        )}

        {!canDelete && (
          <div
            className="px-3 py-1.5 text-xs font-medium rounded border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
            title="Cannot delete plan with locked period snapshots"
          >
            Delete
          </div>
        )}
      </div>
    </div>
  );
}

export function InactiveDistributionPlans({
  plans,
  onView,
  onDuplicate,
  onActivate,
}: InactiveDistributionPlansProps) {
  const shouldCollapseByDefault = plans.length > 3;
  const [isExpanded, setIsExpanded] = useState(!shouldCollapseByDefault);

  if (plans.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex items-center gap-3">
          <svg
            className={`h-5 w-5 text-slate-600 transition-transform duration-200 ${
              isExpanded ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
          <h3 className="text-sm font-semibold text-slate-900">
            Other Plans ({plans.length})
          </h3>
        </div>
        <svg
          className={`h-5 w-5 text-slate-600 transition-transform duration-200 ${
            isExpanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 15l7-7 7 7"
          />
        </svg>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-slate-200">
          {/* Column Headers */}
          <div className="hidden lg:grid grid-cols-12 gap-4 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-4">Plan Name</div>
            <div className="col-span-2">Updated</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-4 text-right">Actions</div>
          </div>

          {/* Plan Rows */}
          <div className="divide-y divide-slate-200">
            {plans.map((plan) => (
              <PlanRow
                key={plan.id}
                plan={plan}
                onView={onView}
                onDuplicate={onDuplicate}
                onActivate={onActivate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
