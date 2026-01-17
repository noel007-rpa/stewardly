import { useMemo, useState, useEffect } from "react";
import { useDistributionPlan } from "../../state/useDistributionPlan";
import { useTransactions } from "../../state/useTransactions";
import { sumByCategory } from "../../utils/transactionsMath";
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

export function DistributionHealth() {
  const plan = useDistributionPlan();
  const transactions = useTransactions();
  const [timeFilter, setTimeFilter] = useState<"month" | "all">("month");
  const [snapTick, setSnapTick] = useState(0);
  const [lockTick, setLockTick] = useState(0);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateSuccess, setRegenerateSuccess] = useState<string | null>(null);

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
    if (timeFilter === "month") {
      return filterTransactionsByPeriod(transactions, getCurrentPeriod());
    }
    return transactions;
  }, [transactions, timeFilter]);

  const actualByCategory = useMemo(() => sumByCategory(filteredTransactions), [filteredTransactions]);

  const totalSpent = useMemo(() => {
    let sum = 0;
    for (const amount of actualByCategory.values()) {
      sum += amount;
    }
    return sum;
  }, [actualByCategory]);

  // Determine which period we're viewing for snapshot logic
  const periodForView = timeFilter === "month" ? getCurrentPeriod() : null;
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

  const healthData = useMemo(() => {
    if (!planForView) return [];

    return planForView.targets.map((target) => {
      const targetPct = target.targetPct;
      const actualAmount = actualByCategory.get(target.category) ?? 0;
      const actualPct = totalSpent > 0 ? (actualAmount / totalSpent) * 100 : 0;
      const variance = actualPct - targetPct; // positive = overspent, negative = underspent

      let status = "On track";
      let statusColor = "text-emerald-700";
      let statusBg = "bg-emerald-100 text-emerald-800";

      if (Math.abs(variance) > 5) {
        // More than 5% variance triggers alert
        if (variance > 0) {
          status = "Overspent";
          statusColor = "text-red-700";
          statusBg = "bg-red-100 text-red-800";
        } else {
          status = "Underspent";
          statusColor = "text-blue-700";
          statusBg = "bg-blue-100 text-blue-800";
        }
      }

      return {
        category: target.category,
        targetPct,
        actualPct: Math.round(actualPct * 10) / 10, // 1 decimal place
        actualAmount,
        variance: Math.round(variance * 10) / 10,
        status,
        statusColor,
        statusBg,
      };
    });
  }, [planForView, actualByCategory, totalSpent]);

  if (!plan) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Distribution Health</h1>
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <p className="text-slate-600">No distribution plan set. Please create a plan first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Distribution Health</h1>

      {/* Filter Buttons */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Time Period</h2>
          <div className="flex gap-2">
            <button
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                timeFilter === "month"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
              onClick={() => setTimeFilter("month")}
            >
              This month
            </button>
            <button
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                timeFilter === "all"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700"
              }`}
              onClick={() => setTimeFilter("all")}
            >
              All time
            </button>
          </div>
        </div>
      </div>

      {periodForView && isPeriodLocked(periodForView) && !hasSnapshot(periodForView) && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-semibold">Snapshot missing</div>
              <div className="mt-1">This period is locked, but the snapshot could not be found. Regenerate it to restore the locked state.</div>
            </div>
            <button
              onClick={() => {
                setRegenerateError(null);
                setRegenerateSuccess(null);
                if (periodForView) {
                  const result = regenerateSnapshot(periodForView);
                  if (result.ok) {
                    setRegenerateSuccess("Snapshot regenerated successfully");
                    setTimeout(() => setRegenerateSuccess(null), 3000);
                  } else {
                    setRegenerateError(result.reason || "Failed to regenerate snapshot");
                    setTimeout(() => setRegenerateError(null), 5000);
                  }
                }
              }}
              className="shrink-0 rounded-lg bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800"
            >
              🔄 Regenerate
            </button>
          </div>
          {regenerateError && (
            <div className="mt-2 rounded bg-red-100 px-2 py-1 text-xs text-red-800">
              Error: {regenerateError}
            </div>
          )}
          {regenerateSuccess && (
            <div className="mt-2 rounded bg-green-100 px-2 py-1 text-xs text-green-800">
              {regenerateSuccess}
            </div>
          )}
        </div>
      )}

      {/* Health Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Category Health</h2>
        <p className="mt-1 text-sm text-slate-600">
          Compare your actual spending against planned allocation percentages.
        </p>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-3">Category</div>
            <div className="col-span-2 text-right">Target %</div>
            <div className="col-span-2 text-right">Actual %</div>
            <div className="col-span-2 text-right">Variance</div>
            <div className="col-span-3 text-right">Status</div>
          </div>

          <div className="divide-y divide-slate-200">
            {healthData.map((item) => (
              <div key={item.category} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm">
                <div className="col-span-3 font-medium">{item.category}</div>
                <div className="col-span-2 text-right text-slate-700">{item.targetPct}%</div>
                <div className="col-span-2 text-right font-medium">{item.actualPct}%</div>
                <div
                  className={`col-span-2 text-right font-medium ${
                    item.variance > 0 ? "text-red-700" : item.variance < 0 ? "text-blue-700" : "text-slate-600"
                  }`}
                >
                  {item.variance > 0 ? "+" : ""}{item.variance}%
                </div>
                <div className="col-span-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${item.statusBg}`}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Summary</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Total Planned</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">100%</div>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Total Spent</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">
              {Math.round(healthData.reduce((sum, item) => sum + item.actualPct, 0) * 10) / 10}%
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600">
          Health status is based on variance from target. Categories with variance &gt; 5% are flagged.
        </p>
      </div>
    </div>
  );
}
