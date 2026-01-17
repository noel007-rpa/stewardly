import type { DistributionPlan } from "../types/distribution";

export type PlanValidation = {
  totalPct: number;
  isTotal100: boolean;
  message: string | null;
};

export type PeriodLockStatus = {
  isLocked: boolean;
  message: string | null;
};

export type TransactionPermission = {
  canAdd: boolean;
  message: string | null;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function getPeriodFromDate(dateStr: string): string {
  return dateStr.substring(0, 7); // YYYY-MM
}

function getLocks(): Set<string> {
  try {
    const raw = localStorage.getItem("stewardly_period_locks");
    return new Set(JSON.parse(raw || "[]"));
  } catch {
    return new Set();
  }
}

export function validateDistributionPlan(plan: DistributionPlan | null): PlanValidation {
  if (!plan) {
    return {
      totalPct: 0,
      isTotal100: false,
      message: "No distribution plan found. Please set up a plan.",
    };
  }

  const totalPct = round2(plan.targets.reduce((acc, t) => acc + t.targetPct, 0));
  const isTotal100 = totalPct === 100;

  return {
    totalPct,
    isTotal100,
    message: isTotal100
      ? null
      : `Your distribution totals ${totalPct}%. Stewardly works best when totals equal 100%.`,
  };
}

/**
 * Check if a distribution plan is valid (totals 100%).
 */
export function isPlanValid(plan: DistributionPlan | null): boolean {
  const validation = validateDistributionPlan(plan);
  return validation.isTotal100;
}

/**
 * Check if a specific period is locked.
 */
export function isPeriodLocked(dateStr: string): PeriodLockStatus {
  const period = getPeriodFromDate(dateStr);
  const locks = getLocks();
  const isLocked = locks.has(period);

  return {
    isLocked,
    message: isLocked ? `This period (${period}) is locked. Unlock it to add transactions.` : null,
  };
}

/**
 * Determine if a transaction can be added to a given date.
 */
export function canAddTransaction(dateStr: string): TransactionPermission {
  const lockStatus = isPeriodLocked(dateStr);

  if (lockStatus.isLocked) {
    return {
      canAdd: false,
      message: lockStatus.message,
    };
  }

  return {
    canAdd: true,
    message: null,
  };
}
