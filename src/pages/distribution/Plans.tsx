import { useDistributionPlans } from "../../state/useDistributionPlans";
import { useNavigate } from "react-router-dom";
import { EmptyDistributionPlans } from "../../components/distribution/EmptyDistributionPlans";
import { ActiveDistributionPlanCard } from "../../components/distribution/ActiveDistributionPlanCard";
import { InactiveDistributionPlans } from "../../components/distribution/InactiveDistributionPlans";

export function Plans() {
  const plans = useDistributionPlans();
  const navigate = useNavigate();
  const activePlan = plans.find((p) => p.isActive);
  const inactivePlans = plans.filter((p) => !p.isActive);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Distribution Plans</h1>
          <p className="text-slate-600 mt-1">
            Create and manage distribution plans that define how your income is allocated across spending categories.
          </p>
        </div>
        <button
          onClick={() => navigate("/plans/new")}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-semibold transition-colors"
        >
          <span>+</span>
          <span>New Plan</span>
        </button>
      </div>

      {/* Active Plan Card */}
      {activePlan ? (
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Active Plan</h2>
          <ActiveDistributionPlanCard
            plan={activePlan}
            isLockedContext={false}
            onEdit={() => navigate(`/plans/${activePlan.id}/edit`)}
            onDuplicate={() => {
              // TODO: Create plan via store
            }}
          />
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
          <p className="text-slate-600 font-medium">No active plan</p>
          <p className="text-slate-500 text-sm mt-1">Create a new distribution plan to get started.</p>
        </div>
      )}

      {/* Inactive Plans List */}
      <InactiveDistributionPlans
        plans={inactivePlans}
        onView={(plan) => navigate(`/plans/${plan.id}/edit`)}
        onDuplicate={() => {
          // TODO: Create plan via store
        }}
      />

      {/* Empty state */}
      {plans.length === 0 && (
        <EmptyDistributionPlans onCreatePlan={() => navigate("/plans/new")} />
      )}
    </div>
  );
}
