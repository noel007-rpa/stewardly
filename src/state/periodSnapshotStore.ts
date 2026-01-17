import type { DistributionTarget } from "../types/distribution";

/**
 * Period Plan Snapshot
 * Stores a snapshot of the distribution plan at the time a period was locked.
 * Ensures historical immutability for locked periods.
 */
export interface PeriodPlanSnapshot {
  period: string; // YYYY-MM
  planId: string;
  planName: string;
  name?: string; // Alias for planName
  currency: string;
  targets: DistributionTarget[];
  lockedAt: string; // ISO timestamp
}

const STORAGE_KEY = "stewardly_period_plan_snapshots";

let listeners: Set<() => void> = new Set();

/**
 * Get all snapshots from localStorage
 */
function getAllSnapshots(): Record<string, PeriodPlanSnapshot> {
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
 * Save all snapshots to localStorage and notify listeners
 */
function saveAllSnapshots(snapshots: Record<string, PeriodPlanSnapshot>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    notifyListeners();
  } catch {
    // Silent fail
  }
}

/**
 * Notify all listeners of changes
 */
function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Get a snapshot for a specific period
 */
export function getSnapshot(period: string): PeriodPlanSnapshot | null {
  const snapshots = getAllSnapshots();
  return snapshots[period] ?? null;
}

/**
 * Save a snapshot (upsert by period)
 */
export function saveSnapshot(snapshot: PeriodPlanSnapshot): void {
  const snapshots = getAllSnapshots();
  snapshots[snapshot.period] = snapshot;
  saveAllSnapshots(snapshots);
}

/**
 * Delete a snapshot for a specific period
 */
export function deleteSnapshot(period: string): void {
  const snapshots = getAllSnapshots();
  delete snapshots[period];
  saveAllSnapshots(snapshots);
}

/**
 * List all snapshots sorted by period (ascending)
 */
export function listSnapshots(): PeriodPlanSnapshot[] {
  const snapshots = getAllSnapshots();
  return Object.values(snapshots).sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Subscribe to snapshot changes
 */
export function subscribeSnapshots(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
