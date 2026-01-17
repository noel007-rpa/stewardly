const KEY = "stewardly_period_locks";

/**
 * Check if a period (YYYY-MM) is locked.
 * Reads from localStorage without side effects.
 */
export function isPeriodLocked(period: string): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;

    // Support both array format ["2025-01", ...] and object format {"2025-01": true, ...}
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.includes(period);
    }
    return Boolean(parsed?.[period]);
  } catch {
    return false;
  }
}

export function getLocks(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(JSON.parse(raw || "[]"));
  } catch {
    return new Set();
  }
}

export function saveLocks(locks: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(Array.from(locks)));
  } catch {
    // Silent fail
  }
}

export function toggleMonthLock(period: string): void {
  const locks = getLocks();
  if (locks.has(period)) {
    locks.delete(period);
  } else {
    locks.add(period);
  }
  saveLocks(locks);
}

export function isMonthLocked(period: string): boolean {
  return getLocks().has(period);
}
