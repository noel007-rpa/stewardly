import { useMemo, useState, useEffect } from "react";
import { useDistributionPlan } from "../../state/useDistributionPlan";
import { getCurrentPeriod } from "../../utils/periods";
import { getSnapshot, subscribeSnapshots } from "../../state/periodSnapshotStore";
import {
  lockPeriod,
  unlockPeriod,
  hasSnapshot,
  regenerateSnapshot,
} from "../../state/periodLockService";
import { isPeriodLocked, subscribeLocks } from "../../state/periodLocksStore";

export function PeriodAllocation() {
  const plan = useDistributionPlan();
  const [monthISO, setMonthISO] = useState<string>(getCurrentPeriod());
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateSuccess, setRegenerateSuccess] = useState<string | null>(null);
  const [snapTick, setSnapTick] = useState(0);

  // Subscribe to locks and snapshots for re-render
  useEffect(() => {
    const unsubscribeLocks = subscribeLocks(() => {
      setIsLocked(isPeriodLocked(monthISO));
    });
    const unsubscribeSnapshots = subscribeSnapshots(() => {
      setSnapTick((x) => x + 1);
    });
    return () => {
      unsubscribeLocks();
      unsubscribeSnapshots();
    };
  }, [monthISO]);

  // Recompute lock status when month changes
  useEffect(() => {
    setIsLocked(isPeriodLocked(monthISO));
    setLockError(null);
    setRegenerateError(null);
    setRegenerateSuccess(null);
  }, [monthISO]);

  const snapshot = useMemo(() => getSnapshot(monthISO), [monthISO, snapTick]);
  const effectivePlan = isLocked && snapshot ? snapshot : plan;
  const snapshotMissing = isLocked && !hasSnapshot(monthISO);

  const totalPct = useMemo(() => {
    if (!effectivePlan) return 0;
    return effectivePlan.targets.reduce((sum, t) => sum + t.targetPct, 0);
  }, [effectivePlan]);

  function handleToggleLock() {
    setLockError(null);
    setRegenerateError(null);
    setRegenerateSuccess(null);

    // Guard: prevent toggling if snapshot is missing for a locked period
    if (isLocked && snapshotMissing) {
      setLockError("Cannot unlock: snapshot is missing. Please regenerate first.");
      return;
    }

    if (isLocked) {
      // Unlocking
      const result = unlockPeriod(monthISO);
      if (!result.ok) {
        setLockError(result.reason);
      }
    } else {
      // Locking
      const result = lockPeriod(monthISO);
      if (!result.ok) {
        setLockError(result.reason);
      }
    }
  }

  function handleRegenerateSnapshot() {
    setRegenerateError(null);
    setRegenerateSuccess(null);

    const result = regenerateSnapshot(monthISO);
    if (result.ok) {
      setRegenerateSuccess("Snapshot regenerated successfully");
      setTimeout(() => setRegenerateSuccess(null), 3000);
    } else {
      setRegenerateError(result.reason);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Period Allocation</h1>

      {/* Month Selector */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Select Period</h2>
        <div className="mt-4 flex items-end gap-4">
          <div className="flex-1 max-w-sm">
            <label className="text-sm font-medium text-slate-700">Month</label>
            <input
              type="month"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={monthISO}
              onChange={(e) => setMonthISO(e.target.value)}
            />
          </div>

          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              isLocked
                ? "bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
            onClick={handleToggleLock}
            disabled={snapshotMissing}
          >
            {isLocked ? "🔓 Unlock" : "🔒 Lock"}
          </button>
        </div>

        {lockError && (
          <div className="mt-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
            {lockError}
          </div>
        )}

        {isLocked && !snapshotMissing && (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="font-semibold">🔒 Locked — changes disabled for {monthISO}</div>
            <div className="mt-1">This period is locked. Historical transaction data is frozen. The live distribution plan remains editable.</div>
          </div>
        )}

        {snapshotMissing && (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
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
      </div>

      {/* Distribution Plan for Period */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Allocation for {monthISO}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {effectivePlan ? `Plan: ${effectivePlan.name} (${effectivePlan.currency})` : "No plan yet"}
        </p>

        {!effectivePlan ? (
          <div className="mt-4 text-sm text-slate-600">No distribution plan set.</div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <div className="col-span-8">Category</div>
              <div className="col-span-4 text-right">Target %</div>
            </div>

            <div className="divide-y divide-slate-200">
              {effectivePlan.targets.map((target) => (
                <div
                  key={target.category}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm"
                >
                  <div className="col-span-8 font-medium">{target.category}</div>
                  <div className="col-span-4 text-right">
                    <span className={isLocked ? "text-slate-500" : "text-slate-900"}>
                      {target.targetPct}%
                    </span>
                  </div>
                </div>
              ))}

              {/* Total Row */}
              <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm font-semibold border-t border-slate-200 bg-slate-50">
                <div className="col-span-8">Total</div>
                <div
                  className={`col-span-4 text-right ${
                    totalPct === 100 ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {totalPct}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">About Period Locks</h2>
        <p className="mt-2 text-sm text-slate-600">
          Lock a period to prevent accidental changes to allocations for that month. Locked periods
          are stored locally and do not affect your main distribution plan.
        </p>
      </div>
    </div>
  );
}
