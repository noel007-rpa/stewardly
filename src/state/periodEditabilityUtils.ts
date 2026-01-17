/**
 * Period Editability Utilities
 * Hard enforcement layer for locked periods
 * These utilities are used by stores to prevent unauthorized modifications
 */

import { isPeriodLocked } from "./periodLocksStore";

/**
 * Custom error for locked period violations
 */
export class LockedPeriodError extends Error {
  constructor(
    period: string,
    action: string
  ) {
    super(
      `Cannot ${action} in locked period ${period}. ` +
      `Locked periods are read-only to preserve historical data.`
    );
    this.name = "LockedPeriodError";
  }
}

/**
 * Assert that a period is editable (not locked)
 * @param period - Period key in YYYY-MM format
 * @param action - Description of the action being guarded (e.g., "add income")
 * @throws LockedPeriodError if period is locked
 */
export function assertPeriodEditable(period: string, action: string): void {
  if (isPeriodLocked(period)) {
    throw new LockedPeriodError(period, action);
  }
}

/**
 * Validate that a period is editable
 * @param period - Period key in YYYY-MM format
 * @param action - Description of the action being guarded
 * @returns { valid: true } if editable, { valid: false, error: string } if locked
 */
export function validatePeriodEditable(
  period: string,
  action: string
): { valid: true } | { valid: false; error: string } {
  if (isPeriodLocked(period)) {
    const error = new LockedPeriodError(period, action);
    return { valid: false, error: error.message };
  }
  return { valid: true };
}

/**
 * Check if a period can be modified
 * @param period - Period key in YYYY-MM format
 * @returns true if period is editable, false if locked
 */
export function isPeriodEditable(period: string): boolean {
  return !isPeriodLocked(period);
}
