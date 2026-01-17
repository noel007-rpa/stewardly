/**
 * Period Lock Service
 * Single source of truth for locking/unlocking periods with snapshot atomicity.
 * Delegates all lock state management to periodLocksStore.
 */

import type { PeriodPlanSnapshot } from "./periodSnapshotStore";
import { saveSnapshot, getSnapshot, deleteSnapshot } from "./periodSnapshotStore";
import { isPeriodLocked, setLocked } from "./periodLocksStore";
import { getDistributionPlan } from "./distributionPlanStore";

/**
 * Validate period key format (YYYY-MM)
 */
export function assertPeriodKey(period: string): void {
  const regex = /^\d{4}-(?:0[1-9]|1[0-2])$/;
  if (!regex.test(period)) {
    throw new Error(
      `Invalid period key: "${period}". Must be YYYY-MM format with month 01-12.`
    );
  }
}

/**
 * Lock a period atomically with snapshot creation
 * Idempotent: if already locked with snapshot, returns ok:true
 */
export function lockPeriod(
  period: string
): { ok: true } | { ok: false; reason: string } {
  console.log("[lockPeriod] Called with period:", period);
  
  try {
    assertPeriodKey(period);
  } catch (err) {
    console.error("[lockPeriod] Invalid period key:", err);
    return { ok: false, reason: (err as Error).message };
  }

  // Check if already locked
  const alreadyLocked = isPeriodLocked(period);
  console.log("[lockPeriod] isPeriodLocked result:", alreadyLocked);
  
  if (alreadyLocked) {
    const snapshot = getSnapshot(period);
    console.log("[lockPeriod] Already locked, checking snapshot:", snapshot ? "exists" : "missing");
    
    if (snapshot) {
      // Already locked with snapshot -> idempotent success
      console.log("[lockPeriod] Already locked with snapshot, idempotent return");
      return { ok: true };
    } else {
      // Already locked but snapshot missing -> cannot proceed
      console.error("[lockPeriod] Locked but snapshot missing");
      return {
        ok: false,
        reason:
          "Period is locked but snapshot is missing; use regenerateSnapshot",
      };
    }
  }

  // Read current distribution plan
  const plan = getDistributionPlan();
  console.log("[lockPeriod] Distribution plan:", plan ? "exists" : "missing");
  
  if (!plan) {
    return { ok: false, reason: "No distribution plan exists to snapshot" };
  }

  // Build snapshot with cloned targets for immutability
  const snapshot: PeriodPlanSnapshot = {
    period,
    planId: plan.id,
    planName: plan.name,
    name: plan.name, // Alias for compatibility
    currency: plan.currency,
    targets: plan.targets.map((t) => ({ ...t })), // Clone targets
    lockedAt: new Date().toISOString(),
  };

  try {
    // Save snapshot FIRST
    console.log("[lockPeriod] Saving snapshot for period:", period);
    saveSnapshot(snapshot);
    console.log("[lockPeriod] Snapshot saved successfully");
  } catch (err) {
    console.error("[lockPeriod] Failed to save snapshot:", err);
    return {
      ok: false,
      reason: `Failed to save snapshot: ${(err as Error).message}`,
    };
  }

  try {
    // Only after snapshot succeeds, set lock flag
    console.log("[lockPeriod] Setting lock flag for period:", period);
    setLocked(period, true);
    console.log("[lockPeriod] Lock flag set successfully");
  } catch (err) {
    // Rollback: delete snapshot to prevent orphan
    console.error("[lockPeriod] Failed to set lock flag, rolling back:", err);
    try {
      deleteSnapshot(period);
    } catch {
      // Silent fail on cleanup
    }
    return {
      ok: false,
      reason: `Failed to set lock flag: ${(err as Error).message}`,
    };
  }

  console.log("[lockPeriod] Completed successfully for period:", period);
  return { ok: true };
}

/**
 * Unlock a period without deleting snapshot
 */
export function unlockPeriod(
  period: string
): { ok: true } | { ok: false; reason: string } {
  try {
    assertPeriodKey(period);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  try {
    setLocked(period, false);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  return { ok: true };
}

/**
 * Regenerate snapshot for a locked period without a snapshot
 */
export function regenerateSnapshot(
  period: string
): { ok: true } | { ok: false; reason: string } {
  try {
    assertPeriodKey(period);
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  // Period must be locked
  if (!isPeriodLocked(period)) {
    return { ok: false, reason: "Period is not locked" };
  }

  // Snapshot must be missing
  if (getSnapshot(period)) {
    return { ok: false, reason: "Snapshot already exists" };
  }

  // Read current distribution plan
  const plan = getDistributionPlan();
  if (!plan) {
    return { ok: false, reason: "No distribution plan exists to snapshot" };
  }

  // Build and save snapshot with cloned targets
  const snapshot: PeriodPlanSnapshot = {
    period,
    planId: plan.id,
    planName: plan.name,
    name: plan.name,
    currency: plan.currency,
    targets: plan.targets.map((t) => ({ ...t })), // Clone targets
    lockedAt: new Date().toISOString(),
  };

  try {
    saveSnapshot(snapshot);
  } catch (err) {
    return {
      ok: false,
      reason: `Failed to regenerate snapshot: ${(err as Error).message}`,
    };
  }

  return { ok: true };
}

/**
 * Check if a period has a snapshot
 */
export function hasSnapshot(period: string): boolean {
  try {
    assertPeriodKey(period);
    return getSnapshot(period) !== null;
  } catch {
    return false;
  }
}

