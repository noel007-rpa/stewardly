import { useMemo, useState, useEffect } from "react";
import { useDistributionPlan } from "../../state/useDistributionPlan";
import { computeAllocations, sumAllocations } from "../../utils/distributionMath";
import { validateDistributionPlan } from "../../utils/planValidation";
import { type DistributionPlan } from "../../types/distribution";
import { InfoTooltip } from "../../components/common/InfoTooltip";
import { useTransactions } from "../../state/useTransactions";
import { sumByCategory, sumTotals } from "../../utils/transactionsMath";
import {
  getCurrentPeriod,
  filterTransactionsByPeriod,
} from "../../utils/periods";
import { getSnapshot, subscribeSnapshots } from "../../state/periodSnapshotStore";
import {
  hasSnapshot,
  regenerateSnapshot,
} from "../../state/periodLockService";
import { isPeriodLocked, subscribeLocks } from "../../state/periodLocksStore";
import { useIncome } from "../../state/useIncome";
import { filterIncomeByPeriod, sumIncome } from "../../utils/incomeMath";
import { updatePlan } from "../../state/distributionPlansStore";

function formatMoney(amount: number, currency = "SGD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatDisplayDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return formatter.format(d);
}

function formatDisplayPeriod(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
  });
  return formatter.format(date);
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

type DistributionPlanEditorProps = {
  draft: DistributionPlan;
  onDraftChange: (draft: DistributionPlan) => void;
  onSave: () => void;
  onCancel: () => void;
};

function DistributionPlanEditor({
  draft,
  onDraftChange,
  onSave,
  onCancel,
}: DistributionPlanEditorProps) {
  const total = useMemo(
    () => round2(draft.targets.reduce((acc, t) => acc + t.targetPct, 0)),
    [draft]
  );

  const canSave = total === 100;

  function updatePct(index: number, value: number) {
    const next = structuredClone(draft);
    next.targets[index].targetPct = Number.isFinite(value) ? value : 0;
    onDraftChange(next);
  }

  return (
    <div className="space-y-4">
      {total !== 100 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          Your distribution totals {total}%. Adjust the values to reach 100% to enable saving.
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
          <div className="col-span-8">Category</div>
          <div className="col-span-4 text-right">Target %</div>
        </div>

        <div className="divide-y divide-slate-200">
          {draft.targets.map((t, idx) => (
            <div key={t.category} className="grid grid-cols-12 items-center px-4 py-2">
              <div className="col-span-8 text-sm">{t.category}</div>
              <div className="col-span-4 flex justify-end">
                <input
                  type="number"
                  className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                  value={t.targetPct}
                  onChange={(e) => updatePct(idx, Number(e.target.value))}
                  min={0}
                  step="1"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 border-t border-slate-200">
          <div className="col-span-8 text-sm font-semibold text-slate-900">Total</div>
          <div className={`col-span-4 text-right text-sm font-semibold ${total === 100 ? "text-slate-900" : "text-amber-700"}`}>
            {total}%
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            canSave
              ? "bg-slate-900 text-white hover:bg-slate-800"
              : "bg-slate-200 text-slate-500 cursor-not-allowed"
          }`}
          onClick={onSave}
          disabled={!canSave}
        >
          Save
        </button>

        <button
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
          onClick={onCancel}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export function CashFlow() {
  const plan = useDistributionPlan();
  const planCheck = validateDistributionPlan(plan);
  const transactions = useTransactions();
  const incomeItems = useIncome();
  const [viewMode, setViewMode] = useState<"thisMonth" | "custom" | "allTime">("thisMonth");
  const [customMonth, setCustomMonth] = useState<string>(getCurrentPeriod());
  const [snapTick, setSnapTick] = useState(0);
  const [lockTick, setLockTick] = useState(0);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateSuccess, setRegenerateSuccess] = useState<string | null>(null);
  const [isPlanOpen, setIsPlanOpen] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [planDraft, setPlanDraft] = useState<DistributionPlan | null>(null);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);

  // Subscribe to locks and snapshots for re-render
  useEffect(() => {
    const unsubscribeLocks = subscribeLocks(() => {
      setLockTick((x) => x + 1);
    });
    const unsubscribeSnapshots = subscribeSnapshots(() => {
      setSnapTick((x) => x + 1);
    });
    return () => {
      unsubscribeLocks();
      unsubscribeSnapshots();
    };
  }, []);

  const filteredTransactions = useMemo(() => {
    if (viewMode === "allTime") {
      return transactions;
    }
    const period = viewMode === "custom" ? customMonth : getCurrentPeriod();
    return filterTransactionsByPeriod(transactions, period);
  }, [transactions, viewMode, customMonth]);

  // Calculate period for income filtering
  const periodForIncome = useMemo(() => {
    if (viewMode === "allTime") return null;
    if (viewMode === "custom") return customMonth;
    return getCurrentPeriod();
  }, [viewMode, customMonth]);

  // Calculate income from records for selected period
  const effectiveIncome = useMemo(() => {
    return sumIncome(filterIncomeByPeriod(incomeItems, periodForIncome));
  }, [incomeItems, periodForIncome]);

  const actualByCategory = useMemo(
    () => sumByCategory(filteredTransactions),
    [filteredTransactions]
  );

  const cashFlowTotals = useMemo(() => sumTotals(filteredTransactions), [filteredTransactions]);

  // Determine which period we're viewing for snapshot logic
  const periodForView = useMemo(() => {
    if (viewMode === "allTime") return null;
    if (viewMode === "custom") return customMonth;
    return getCurrentPeriod(); // thisMonth
  }, [viewMode, customMonth]);
  const snapshot = useMemo(
    () => (periodForView ? getSnapshot(periodForView) : null),
    [periodForView, snapTick]
  );

  // Get plan to use (snapshot if locked, live if not)
  const planForView = useMemo(() => {
    if (!plan) return null;

    if (periodForView && isPeriodLocked(periodForView) && snapshot) {
      // Use snapshot plan for locked periods
      return snapshot;
    }
    // Use live plan
    return plan;
  }, [plan, periodForView, snapshot, lockTick]);

  const lines = useMemo(() => {
    if (!planForView) return [];
    
    const allocPlan = {
      id: (planForView as any).id ?? (planForView as any).planId ?? "snapshot",
      name: (planForView as any).name ?? (planForView as any).planName ?? "Snapshot plan",
      currency: planForView.currency,
      targets: planForView.targets,
    } as DistributionPlan;
    
    return computeAllocations(allocPlan, effectiveIncome);
  }, [planForView, effectiveIncome]);

  const total = useMemo(() => sumAllocations(lines), [lines]);

  const totals = useMemo(() => {
    if (!planForView) return null;

    let planned = 0;
    let actual = 0;

    for (const t of planForView.targets) {
      planned += (effectiveIncome * t.targetPct) / 100;
      actual += actualByCategory.get(t.category) ?? 0;
    }

    const remaining = planned - actual;
    return { planned, actual, remaining };
  }, [planForView, effectiveIncome, actualByCategory]);

  const currency = plan?.currency ?? "SGD";
  const currencyForView = planForView?.currency ?? plan?.currency ?? "SGD";

  const isLockedView = periodForView !== null && isPeriodLocked(periodForView);

  const totalShowBadge = totals && totals.remaining <= 0;

  const snapshotMissing = periodForView && isPeriodLocked(periodForView) && !hasSnapshot(periodForView);

  function handleRegenerateSnapshot() {
    setRegenerateError(null);
    setRegenerateSuccess(null);

    if (!periodForView) return;

    const result = regenerateSnapshot(periodForView);
    if (result.ok) {
      setRegenerateSuccess("Snapshot regenerated successfully");
      setTimeout(() => setRegenerateSuccess(null), 3000);
    } else {
      setRegenerateError(result.reason);
    }
  }

  return (
    <div className="space-y-6">
      {planCheck.message && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Plan warning</div>
          <div className="mt-1">{planCheck.message}</div>
        </div>
      )}

      {snapshotMissing && (
        <div className="space-y-3 rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="text-sm text-red-900">
            This period is locked, but the plan snapshot is missing.
          </div>
          <button
            className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-200"
            onClick={handleRegenerateSnapshot}
          >
            Regenerate snapshot
          </button>
          {regenerateError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              {regenerateError}
            </div>
          )}
          {regenerateSuccess && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
              {regenerateSuccess}
            </div>
          )}
        </div>
      )}

      <div className="flex items-baseline justify-between">
        <h1 className="text-3xl font-bold">Cash Flow</h1>
        <div className="text-sm text-slate-600">
          <span>{formatDisplayDate(new Date())}</span>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Net Cash Flow</h2>
            <p className="mt-1 text-sm text-slate-600">
              Total income, expenses, and net cash flow.
            </p>
          </div>
          <div className="text-sm text-slate-600">
            Period: {formatDisplayPeriod(customMonth ?? getCurrentPeriod())}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Total Income</span>
              <InfoTooltip
                label="Total Income"
                content={
                  <div className="space-y-2 text-sm">
                    <p><strong>Actual income received during the selected period.</strong></p>
                    <p className="text-xs text-gray-600">Example: Salary received: {currency} 3,000 → Total Income = {currency} 3,000.</p>
                    <p className="text-xs text-gray-500">Based on recorded transactions.</p>
                  </div>
                }
                side="top"
              />
            </div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {formatMoney(cashFlowTotals.totalIn, currency)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Total Expenses</span>
              <InfoTooltip
                label="Total Expenses"
                content={
                  <div className="space-y-2 text-sm">
                    <p><strong>Actual money spent during the selected period.</strong></p>
                    <p className="text-xs text-gray-600">Example: Rent {currency} 2,000 + Groceries {currency} 333 → Total Expenses = {currency} 2,333.</p>
                    <p className="text-xs text-gray-500">Based on recorded transactions.</p>
                  </div>
                }
                side="top"
              />
            </div>
            <div className="mt-2 text-2xl font-semibold text-red-700">
              {formatMoney(cashFlowTotals.totalOut, currency)}
            </div>
          </div>

          <div className={`rounded-lg border border-slate-200 bg-slate-50 p-4`}>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Net Cash Flow</span>
              <InfoTooltip
                label="Net Cash Flow"
                content={
                  <div className="space-y-2 text-sm">
                    <p><strong>Actual result: money in minus money out for the selected period.</strong></p>
                    <p className="text-xs text-gray-600">Formula: Net Cash Flow = Actual Income − Actual Expenses</p>
                    <p className="text-xs text-gray-600">Example: If Total Income = {currency} 0 and Total Expenses = {currency} 2,000 → Net Cash Flow = −{currency} 2,000.</p>
                    <p className="text-xs text-gray-500">Not planned amounts.</p>
                  </div>
                }
                side="top"
              />
            </div>
            <div
              className={`mt-2 text-2xl font-semibold ${
                cashFlowTotals.net >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {formatMoney(cashFlowTotals.net, currency)}
            </div>
          </div>
        </div>
      </div>

      {/* Merged Distribution Plan Card */}
      <div className="rounded-lg border border-slate-200 bg-white">
        <div
          className="flex cursor-pointer items-center justify-between p-6 transition-all duration-200 hover:bg-slate-50"
          role="button"
          tabIndex={0}
          aria-expanded={isPlanOpen}
          onClick={() => {
            setIsPlanOpen(!isPlanOpen);
            if (!isPlanOpen && isEditingPlan) {
              setIsEditingPlan(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsPlanOpen(!isPlanOpen);
              if (!isPlanOpen && isEditingPlan) {
                setIsEditingPlan(false);
              }
            }
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Distribution Plan</h2>
              {/* Chevron icon */}
              <svg
                className={`h-5 w-5 text-slate-600 transition-transform duration-200 ${
                  isPlanOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {plan ? `${plan.name} (${plan.currency})` : "No plan yet"}
            </p>
          </div>

          {isPlanOpen && (
            <div className="flex gap-2">
              {plan && (
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isEditingPlan) {
                      setIsEditingPlan(false);
                    } else {
                      setPlanDraft(structuredClone(plan));
                      setIsEditingPlan(true);
                    }
                  }}
                >
                  {isEditingPlan ? "Cancel" : "Edit"}
                </button>
              )}
            </div>
          )}
        </div>

        {isPlanOpen && (
          <div className="border-t border-slate-200 px-6 py-4">
            {!isEditingPlan ? (
              // Read-only view
              plan ? (
                <ul className="space-y-2">
                  {plan.targets.map((t) => (
                    <li key={t.category} className="flex justify-between text-sm">
                      <span>{t.category}</span>
                      <span className="font-medium">{t.targetPct}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">No plan yet</p>
              )
            ) : (
              // Edit view
              plan &&
              planDraft && (
                <DistributionPlanEditor
                  draft={planDraft}
                  onDraftChange={setPlanDraft}
                  onSave={() => {
                    updatePlan(planDraft);
                    setIsEditingPlan(false);
                  }}
                  onCancel={() => {
                    setIsEditingPlan(false);
                  }}
                />
              )
            )}
          </div>
        )}
      </div>

      {isLockedView && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="font-semibold">Locked period snapshot</div>
          <div className="mt-1">You are viewing a locked period. The distribution plan remains editable. Historical transactions are frozen.</div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white">
        <div
          className="flex cursor-pointer items-center justify-between p-6 transition-all duration-200 hover:bg-slate-50"
          role="button"
          tabIndex={0}
          aria-expanded={isComparisonOpen}
          onClick={() => setIsComparisonOpen(!isComparisonOpen)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsComparisonOpen(!isComparisonOpen);
            }
          }}
        >
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Planned vs Actual</h2>
              {/* Chevron icon */}
              <svg
                className={`h-5 w-5 text-slate-600 transition-transform duration-200 ${
                  isComparisonOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mt-1 text-sm text-slate-600">
              Compare distribution plan against spending.
            </p>
          </div>
        </div>

        {isComparisonOpen && (
          <div className="border-t border-slate-200 px-6 py-4">
            <div className="flex gap-2 mb-6">
              <button
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  viewMode === "thisMonth"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
                onClick={() => setViewMode("thisMonth")}
              >
                This month
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  viewMode === "custom"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
                onClick={() => setViewMode("custom")}
              >
                Custom month
              </button>
              <button
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  viewMode === "allTime"
                    ? "bg-slate-900 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
                onClick={() => setViewMode("allTime")}
              >
                All time
              </button>

              {viewMode === "custom" && (
                <input
                  type="month"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={customMonth}
                  onChange={(e) => setCustomMonth(e.target.value)}
                />
              )}
            </div>

            {!plan ? (
              <div className="mt-4 text-sm text-slate-600">No plan yet.</div>
            ) : (
              <div className="mt-6">
                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <div className="col-span-3">Category</div>
                    <div className="col-span-3 text-right">Planned</div>
                    <div className="col-span-3 text-right">Actual</div>
                    <div className="col-span-3 text-right">Remaining</div>
                  </div>

                  <div className="divide-y divide-slate-200">
                    {planForView?.targets.map((target) => {
                      const planned = (effectiveIncome * target.targetPct) / 100;
                      const actual = actualByCategory.get(target.category) ?? 0;
                      const remaining = planned - actual;

                      const isOver = remaining < 0;

                      const showBadge = remaining <= 0;

                      let badgeText = "";
                      let badgeClass = "";

                      if (remaining < 0) {
                        badgeText = "Overspent";
                        badgeClass = "bg-red-100 text-red-800";
                      } else if (remaining === 0) {
                        badgeText = "Fully used";
                        badgeClass = "bg-slate-100 text-slate-700";
                      }

                      return (
                        <div
                          key={target.category}
                          className={`grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm ${
                            isOver ? "bg-red-50" : ""
                          }`}
                        >
                          <div className="col-span-3 font-medium flex items-center gap-2">
                            <span>{target.category}</span>
                          </div>

                          <div className="col-span-3 text-right text-slate-700">
                            {formatMoney(planned, currencyForView)}
                          </div>

                          <div
                            className={`col-span-3 text-right font-medium ${
                              isOver ? "text-red-700" : "text-slate-900"
                            }`}
                          >
                            {formatMoney(actual, currencyForView)}
                          </div>

                          <div
                            className={`col-span-3 text-right font-medium flex items-center justify-end gap-2 ${
                              isOver ? "text-red-700" : remaining === 0 ? "text-slate-600" : "text-emerald-700"
                            }`}
                          >
                            <span>{formatMoney(remaining, currencyForView)}</span>

                            {showBadge && (
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}
                              >
                                {badgeText}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {totals && (
                      <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm font-semibold border-t border-slate-200">
                        <div className="col-span-3 flex items-center gap-2">
                          <span>Total</span>
                          {totalShowBadge && (
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                totals.remaining < 0
                                  ? "bg-red-100 text-red-800"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {totals.remaining < 0 ? "Overspent" : "Fully used"}
                            </span>
                          )}
                        </div>
                        <div className="col-span-3 text-right">
                          {formatMoney(totals.planned, currencyForView)}
                        </div>
                        <div className="col-span-3 text-right">
                          {formatMoney(totals.actual, currencyForView)}
                        </div>
                        <div
                          className={`col-span-3 text-right ${
                            totals.remaining < 0
                              ? "text-red-700"
                              : totals.remaining === 0
                              ? "text-slate-600"
                              : "text-emerald-700"
                          }`}
                        >
                          {formatMoney(totals.remaining, currencyForView)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Income Allocation</h2>

        <div className="mt-2">
          <p className="text-sm text-slate-600">
            Based on your recorded income, Stewardly calculates your target distribution.
          </p>

          {effectiveIncome === 0 && (
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              No income recorded for this period. Record income to see allocation targets.
            </div>
          )}

          {effectiveIncome > 0 && (
            <>
              {/* Income Display */}
              <div className="mt-4 flex max-w-sm items-end gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium text-slate-700">Recorded Income</label>
                  <div className="mt-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    {formatMoney(effectiveIncome, currencyForView)}
                  </div>
                </div>
              </div>

              {!planForView ? (
                <div className="mt-4 text-sm text-slate-600">No plan yet.</div>
              ) : (
                <div className="mt-6">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Category</span>
                    <span>Amount</span>
                  </div>

                  <div className="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
                    {lines.map((l) => (
                      <div key={l.category} className="flex justify-between px-4 py-2 text-sm">
                        <span>{l.category} ({l.targetPct}%)</span>
                        <span className="font-medium">
                          {planForView.currency} {l.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}

                    <div className="flex justify-between px-4 py-2 text-sm font-semibold">
                      <span>Total</span>
                      <span>
                        {planForView.currency} {total.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {periodForView !== null && isPeriodLocked(periodForView) && (
                    <div className="mt-4 flex items-start gap-2 rounded-lg bg-slate-50 p-3">
                      <div className="mt-0.5 h-5 w-5 text-slate-500">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-semibold text-slate-700">
                          This period is locked
                        </p>
                        <p className="mt-1 text-xs text-slate-600">
                          These targets are from your saved snapshot.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}