/**
 * Snapshot Helper
 * Provides snapshot-aware plan resolution for locked periods.
 */

import type { DistributionTarget } from "../types/distribution";
import { isPeriodLocked } from "../state/periodLocksStore";
import { getSnapshot } from "../state/periodSnapshotStore";
import { getDistributionPlan } from "../state/distributionPlanStore";

export interface PeriodPlan {
  currency: string;
  targets: DistributionTarget[];
  source: "snapshot" | "live";
  lockedAt?: string;
}

/**
 * Get the appropriate plan for a period (snapshot if locked, live if unlocked)
 * @param period - YYYY-MM format period key, or null for all-time
 * @returns Plan object with source metadata, or null if no plan exists
 */
export function getPlanForPeriod(period: string | null): PeriodPlan | null {
  if (!period) {
    // All-time view uses live plan
    const plan = getDistributionPlan();
    if (!plan) return null;
    return {
      currency: plan.currency,
      targets: plan.targets,
      source: "live",
    };
  }

  // Check if period is locked
  if (isPeriodLocked(period)) {
    const snapshot = getSnapshot(period);
    if (snapshot) {
      return {
        currency: snapshot.currency,
        targets: snapshot.targets,
        source: "snapshot",
        lockedAt: snapshot.lockedAt,
      };
    }
    // Locked but no snapshot
    return null;
  }

  // Unlocked - use live plan
  const plan = getDistributionPlan();
  if (!plan) return null;
  return {
    currency: plan.currency,
    targets: plan.targets,
    source: "live",
  };
}
