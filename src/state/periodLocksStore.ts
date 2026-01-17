/**
 * Period Locks Store
 * Persists which periods are locked to localStorage.
 * Centralized source of truth for all lock operations.
 */

const STORAGE_KEY = "stewardly_period_locks";

let listeners: Set<() => void> = new Set();

/**
 * Get all locks from localStorage
 */
function getAllLocks(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Notify all listeners of changes
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Check if a period is locked (read-only query)
 * @param period - Period key in YYYY-MM format
 * @returns true if period is locked, false otherwise
 */
export function isPeriodLocked(period: string): boolean {
  const locks = getAllLocks();
  const result = locks[period] === true;
  console.log("[periodLocksStore] isPeriodLocked:", { period, locks, result });
  return result;
}

/**
 * Assert that a period is unlocked, throw if locked
 * @param period - Period key in YYYY-MM format
 * @param actionLabel - Optional description of the action being guarded (e.g., "add income")
 * @throws Error with readable message if period is locked
 */
export function assertPeriodUnlocked(period: string, actionLabel?: string): void {
  if (isPeriodLocked(period)) {
    const action = actionLabel ? ` Action blocked: ${actionLabel}.` : "";
    throw new Error(`Locked period: ${period}.${action}`);
  }
}

/**
 * Set lock state for a period
 * Always notifies listeners for reliable reactivity, even if state unchanged.
 * @param period - Period key in YYYY-MM format
 * @param locked - true to lock, false to unlock
 */
export function setLocked(period: string, locked: boolean): void {
  console.log("[periodLocksStore] setLocked called:", { period, locked });
  const locks = getAllLocks();
  console.log("[periodLocksStore] Current locks before update:", locks);
  const currentValue = locks[period] === true;
  console.log("[periodLocksStore] Current value for period:", currentValue);
  
  // Update state
  if (locked) {
    locks[period] = true;
  } else {
    delete locks[period];
  }
  
  console.log("[periodLocksStore] Locks after update:", locks);
  
  // Always save and notify, even if state unchanged
  try {
    const serialized = JSON.stringify(locks);
    console.log("[periodLocksStore] setLocked: saving to localStorage", { period, locked, locks });
    localStorage.setItem(STORAGE_KEY, serialized);
    console.log("[periodLocksStore] setLocked: localStorage.setItem succeeded");
    
    // Verify it was actually saved
    const verify = localStorage.getItem(STORAGE_KEY);
    console.log("[periodLocksStore] setLocked: verification read:", verify);
  } catch (err) {
    console.error("[periodLocksStore] setLocked: ERROR saving to localStorage", err);
  }
  console.log("[periodLocksStore] setLocked: calling notifyListeners");
  notifyListeners();
  console.log("[periodLocksStore] setLocked: complete");
}

/**
 * Subscribe to lock changes
 * @param listener - Callback invoked when any lock state changes
 * @returns Unsubscribe function
 */
export function subscribeLocks(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get all locks (read-only)
 * Used for validation and testing
 * @returns Object with period keys and boolean lock states
 */
export function getLocks(): Record<string, boolean> {
  return getAllLocks();
}
