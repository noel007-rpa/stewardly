/**
 * Period Lock Guard
 * Enforces that locked periods are truly immutable
 * All write operations must call assertPeriodEditable before proceeding
 */

import { isPeriodLocked } from "./periodLocksStore";

/**
 * Custom error for locked period violations
 */
export class LockedPeriodError extends Error {
  constructor(period: string) {
    super(`This period (${period}) is locked and cannot be modified.`);
    this.name = "LockedPeriodError";
  }
}

/**
 * Extract YYYY-MM from an ISO date string
 * @param dateString ISO date (YYYY-MM-DD) or YYYY-MM
 * @returns YYYY-MM string
 */
export function extractPeriod(dateString: string): string {
  if (!dateString) return "";
  // Extract first 7 characters (YYYY-MM)
  return dateString.substring(0, 7);
}

/**
 * Check if a period is locked (read-only)
 * @param period YYYY-MM string
 * @returns true if the period is locked, false otherwise
 */
export function isPeriodLockedCheck(period: string): boolean {
  return isPeriodLocked(period);
}

/**
 * Assert that a period is editable
 * Throws LockedPeriodError if the period is locked
 * @param period YYYY-MM string
 * @throws LockedPeriodError if the period is locked
 */
export function assertPeriodEditable(period: string): void {
  if (isPeriodLocked(period)) {
    throw new LockedPeriodError(period);
  }
}

/**
 * Assert that a date (ISO string) belongs to an editable period
 * @param dateString ISO date (YYYY-MM-DD or YYYY-MM)
 * @throws LockedPeriodError if the period is locked
 */
export function assertDateEditable(dateString: string): void {
  const period = extractPeriod(dateString);
  assertPeriodEditable(period);
}

/**
 * Get a user-friendly error message for a locked period
 * @param period YYYY-MM string
 * @returns Error message string
 */
export function getLockedPeriodMessage(period: string): string {
  return `This period (${period}) is locked and cannot be modified.`;
}
