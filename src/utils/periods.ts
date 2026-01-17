/**
 * Centralized period handling and utilities.
 * All period operations use YYYY-MM format.
 * 
 * Lock operations are delegated to periodLocksStore for consistency.
 */

import { isPeriodLocked as isPeriodLockedInStore } from "../state/periodLocksStore";

/**
 * Get current period in YYYY-MM format
 */
export function getCurrentPeriod(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

/**
 * Extract period (YYYY-MM) from an ISO date string (YYYY-MM-DD)
 * Alias for getPeriodFromDate for consistency
 */
export function periodFromDate(dateISO: string): string {
  return dateISO.substring(0, 7); // Extract YYYY-MM
}

/**
 * Extract period (YYYY-MM) from an ISO date string (YYYY-MM-DD)
 */
export function getPeriodFromDate(dateISO: string): string {
  return periodFromDate(dateISO);
}

/**
 * Filter transactions by period (YYYY-MM)
 */
export function filterTransactionsByPeriod(
  transactions: any[],
  period: string
): any[] {
  return transactions.filter((t) => getPeriodFromDate(t.date) === period);
}

/**
 * Check if a specific period (YYYY-MM) is locked
 * Delegates to centralized periodLocksStore
 */
export function isPeriodLocked(period: string): boolean {
  return isPeriodLockedInStore(period);
}

/**
 * Get all locked periods as a Set
 */
export function getLockedPeriods(): Set<string> {
  try {
    const raw = localStorage.getItem("stewardly_period_locks");
    if (!raw) return new Set();

    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      // Object format {"2025-01": true, ...}
      return new Set(Object.keys(parsed).filter((k) => parsed[k] === true));
    }
    return new Set();
  } catch {
    return new Set();
  }
}

/**
 * Save locked periods to localStorage (as object format for consistency with periodLocksStore)
 */
export function saveLockedPeriods(periods: Set<string>): void {
  try {
    const obj: Record<string, boolean> = {};
    periods.forEach((p) => {
      obj[p] = true;
    });
    localStorage.setItem("stewardly_period_locks", JSON.stringify(obj));
  } catch {
    // Silent fail
  }
}

/**
 * Toggle lock status for a specific period
 */
export function togglePeriodLock(period: string): void {
  const locked = getLockedPeriods();
  if (locked.has(period)) {
    locked.delete(period);
  } else {
    locked.add(period);
  }
  saveLockedPeriods(locked);
}

/**
 * Filter transactions by period (null = all)
 */
export function filterByPeriod(
  transactions: any[],
  periodKey: string | null
): any[] {
  if (periodKey === null) {
    return transactions;
  }
  return transactions.filter((t) => getPeriodFromDate(t.date) === periodKey);
}

/**
 * Sum amounts by direction (in/out)
 */
export function sumByDirection(
  transactions: any[]
): { totalIn: number; totalOut: number; net: number } {
  let totalIn = 0;
  let totalOut = 0;

  for (const t of transactions) {
    if (t.direction === "in") {
      totalIn += t.amount || 0;
    } else if (t.direction === "out") {
      totalOut += t.amount || 0;
    }
  }

  return {
    totalIn,
    totalOut,
    net: totalIn - totalOut,
  };
}
