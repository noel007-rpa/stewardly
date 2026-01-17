/**
 * Income Recurrence Engine
 * Computes virtual recurring income VIRTUALLY without persisting to storage.
 * Lock-safe and non-destructive.
 */

import type { IncomeRecord } from "../types/income";
import { isPeriodLocked } from "../state/periodLocksStore";

/**
 * Represents both stored and virtual income entries
 */
export type EffectiveIncome = IncomeRecord & {
  isVirtual?: boolean; // true = generated from recurrence rule, not stored
};

/**
 * Parse YYYY-MM period to year and month
 */
export function parsePeriod(period: string): { year: number; month: number } {
  const [yyyy, mm] = period.split("-");
  return {
    year: parseInt(yyyy, 10),
    month: parseInt(mm, 10),
  };
}

/**
 * Get last day of a given month
 */
export function getLastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDate(year: number, month: number, day: number): string {
  const yyyy = String(year).padStart(4, "0");
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Check if an income is active and should generate recurrence
 */
export function isIncomeActive(income: IncomeRecord): boolean {
  return income.status === "active" && income.frequency === "monthly";
}

/**
 * Check if a date falls within income's start/end date bounds
 */
export function isWithinBounds(
  targetDate: string, // YYYY-MM-DD
  startDate?: string,
  endDate?: string
): boolean {
  if (startDate && targetDate < startDate) return false;
  if (endDate && targetDate > endDate) return false;
  return true;
}

/**
 * Generate the effective date for a monthly recurring income in a given period
 * Returns null if the income doesn't apply to this period
 */
export function getRecurrenceDate(
  income: IncomeRecord,
  period: string // YYYY-MM
): string | null {
  if (!isIncomeActive(income)) return null;

  const { year, month } = parsePeriod(period);

  // Determine target day
  let targetDay: number;
  if (income.monthlyPayRule === "endOfMonth") {
    targetDay = getLastDayOfMonth(year, month);
  } else if (income.monthlyPayRule === "dayOfMonth" && income.monthlyPayDay) {
    const lastDay = getLastDayOfMonth(year, month);
    // Clamp to valid day for this month (e.g., 31st in Feb becomes 28/29)
    targetDay = Math.min(income.monthlyPayDay, lastDay);
  } else {
    // No recurrence rule, skip
    return null;
  }

  const targetDate = formatDate(year, month, targetDay);

  // Check bounds
  if (!isWithinBounds(targetDate, income.startDate, income.endDate)) {
    return null;
  }

  return targetDate;
}

/**
 * Generate a virtual income record for a period
 * @param income - The income record to virtualize
 * @param period - YYYY-MM period
 * @returns Virtual income record or null if doesn't apply
 */
export function generateVirtualIncome(
  income: IncomeRecord,
  period: string
): EffectiveIncome | null {
  const recurrenceDate = getRecurrenceDate(income, period);
  if (!recurrenceDate) return null;

  // Check if we already have a stored entry for this same income on this date
  // (This is checked by the caller, not here)

  return {
    ...income,
    date: recurrenceDate,
    id: `virtual_${income.id}_${period}`,
    isVirtual: true,
  };
}

/**
 * Get effective income for a period
 * Returns stored income PLUS virtual recurring income (if period is not locked)
 *
 * @param period - YYYY-MM period
 * @param storedIncome - Array of stored income records (from store)
 * @returns Effective income array (stored + virtual)
 */
export function getEffectiveIncomeForPeriod(
  period: string,
  storedIncome: IncomeRecord[]
): EffectiveIncome[] {
  const result: EffectiveIncome[] = [];

  // Add all stored income for this period
  const storedForPeriod = storedIncome.filter((income) => {
    const incomePeriod = income.date.slice(0, 7);
    return incomePeriod === period;
  });
  result.push(...storedForPeriod);

  // If period is locked, don't add virtual income (use only historical stored data)
  if (isPeriodLocked(period)) {
    return result;
  }

  // Generate virtual recurring income for this period
  const virtualIncome = storedIncome
    .filter((income) => income.frequency === "monthly" && income.status === "active")
    .map((income) => generateVirtualIncome(income, period))
    .filter((income): income is EffectiveIncome => Boolean(income));

  // Avoid duplicates: if a recurring income has been manually stored for this period, skip the virtual
  const storedIds = new Set(storedForPeriod.map((income) => income.id));
  const uniqueVirtual = virtualIncome.filter((virtual) => !storedIds.has(virtual.id));

  result.push(...uniqueVirtual);

  return result;
}

/**
 * Sum effective income by direction
 * Includes virtual income if period is unlocked
 */
export function sumEffectiveIncome(
  effectiveIncome: EffectiveIncome[]
): number {
  return effectiveIncome.reduce((sum, income) => sum + income.amount, 0);
}

/**
 * Filter effective income by a category (for dashboard use)
 */
export function filterEffectiveIncomeByName(
  effectiveIncome: EffectiveIncome[],
  name: string
): EffectiveIncome[] {
  return effectiveIncome.filter((income) => income.name === name);
}
