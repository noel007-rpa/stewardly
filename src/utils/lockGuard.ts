import { 
  isPeriodLocked, 
  assertPeriodUnlocked as assertPeriodUnlockedThrows 
} from "../state/periodLocksStore";

/**
 * Extract YYYY-MM period key from YYYY-MM-DD ISO date string
 */
export function getPeriodKeyFromDate(dateISO: string): string {
  return dateISO.slice(0, 7);
}

/**
 * Check if a period is unlocked and can be modified.
 * Returns error result if period is locked.
 * 
 * This is the non-throwing version used by stores that need to return result objects.
 */
export function assertPeriodUnlocked(
  periodKey: string
): { ok: true } | { ok: false; reason: string } {
  if (isPeriodLocked(periodKey)) {
    return {
      ok: false,
      reason: `Period ${periodKey} is locked and cannot be modified`,
    };
  }
  return { ok: true };
}

/**
 * Assert that a period is unlocked, throwing if locked.
 * This is the throwing version for use in stores that need to throw errors.
 * 
 * @param periodKey - Period in YYYY-MM format
 * @param actionLabel - Optional description of the action (e.g., "add income")
 * @throws Error with readable message if period is locked
 */
export function assertPeriodUnlockedOrThrow(
  periodKey: string,
  actionLabel?: string
): void {
  assertPeriodUnlockedThrows(periodKey, actionLabel);
}

/**
 * Check if a period can be edited
 * @param periodKey - Period in YYYY-MM format
 * @returns true if editable, false if locked
 */
export function isPeriodEditable(periodKey: string): boolean {
  return !isPeriodLocked(periodKey);
}