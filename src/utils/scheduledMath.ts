/**
 * Scheduled Transaction Projection and Matching
 * Computes expected vs. actual transactions for a period based on templates.
 */

import type { ScheduledTransactionTemplate } from "../types/scheduled";
import type { MoneyTransaction } from "../types/transactions";

export interface ScheduledProjectionRow {
  template: ScheduledTransactionTemplate;
  expectedDateISO: string;
  matchedTransactionId?: string;
  matchedAmount?: number;
  status: "matched" | "missing" | "inactive";
}

/**
 * Get the number of days in a month
 */
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Compute the expected date for a template in a given period
 * @param template - The scheduled template
 * @param period - Period in YYYY-MM format
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
function computeExpectedDate(
  template: ScheduledTransactionTemplate,
  period: string
): string | null {
  try {
    const [yearStr, monthStr] = period.split("-");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return null;
    }

    if (template.rule === "endOfMonth") {
      const daysInMonth = getDaysInMonth(year, month);
      return `${year}-${String(month).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
    }

    if (template.rule === "dayOfMonth" && template.day) {
      const day = Math.min(template.day, getDaysInMonth(year, month));
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract period (YYYY-MM) from an ISO date (YYYY-MM-DD)
 */
function getPeriodFromDate(dateISO: string): string {
  return dateISO.substring(0, 7);
}

/**
 * Check if amounts are approximately equal (within 0.01 tolerance)
 */
function amountsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.01;
}

/**
 * Check if a transaction matches a template based on matchMode
 */
function transactionMatches(
  tx: MoneyTransaction,
  template: ScheduledTransactionTemplate
): boolean {
  // Direction must match
  if (tx.direction !== template.direction) {
    return false;
  }

  // Category must match
  if (tx.category !== template.category) {
    return false;
  }

  // Apply matchMode logic
  const mode = template.matchMode ?? "amountOnly";

  if (mode === "amountOnly") {
    return amountsEqual(tx.amount, template.amount);
  }

  if (mode === "keyword") {
    if (!template.matchKeyword) return false;
    const keyword = template.matchKeyword.toLowerCase();
    const note = (tx.note ?? "").toLowerCase();
    return note.includes(keyword);
  }

  if (mode === "both") {
    if (!template.matchKeyword) return false;
    const amountOk = amountsEqual(tx.amount, template.amount);
    const keyword = template.matchKeyword.toLowerCase();
    const note = (tx.note ?? "").toLowerCase();
    const keywordOk = note.includes(keyword);
    return amountOk && keywordOk;
  }

  return false;
}

/**
 * Project scheduled transactions against actual transactions for a period
 * @param templates - Array of scheduled transaction templates
 * @param transactions - Array of actual money transactions
 * @param period - Period in YYYY-MM format
 * @returns Array of projection rows showing expected vs. matched state
 */
export function projectScheduledTransactions(
  templates: ScheduledTransactionTemplate[],
  transactions: MoneyTransaction[],
  period: string
): ScheduledProjectionRow[] {
  const rows: ScheduledProjectionRow[] = [];
  const usedTxIds = new Set<string>();

  for (const template of templates) {
    // Skip inactive templates
    if (!template.active) {
      rows.push({
        template,
        expectedDateISO: computeExpectedDate(template, period) ?? "",
        status: "inactive",
      });
      continue;
    }

    // Compute expected date
    const expectedDateISO = computeExpectedDate(template, period);
    if (!expectedDateISO) {
      rows.push({
        template,
        expectedDateISO: "",
        status: "missing",
      });
      continue;
    }

    // Find matching transactions in the same period
    const periodTransactions = transactions.filter(
      (tx) => getPeriodFromDate(tx.date) === period
    );

    // Find first matching transaction (earliest)
    const matchedTx = periodTransactions.find(
      (tx) => !usedTxIds.has(tx.id) && transactionMatches(tx, template)
    );

    if (matchedTx) {
      usedTxIds.add(matchedTx.id);
      rows.push({
        template,
        expectedDateISO,
        matchedTransactionId: matchedTx.id,
        matchedAmount: matchedTx.amount,
        status: "matched",
      });
    } else {
      rows.push({
        template,
        expectedDateISO,
        status: "missing",
      });
    }
  }

  return rows;
}

/**
 * Calculate total expected amount from projection rows
 */
export function expectedTotal(rows: ScheduledProjectionRow[]): number {
  return rows
    .filter((row) => row.status !== "inactive")
    .reduce((sum, row) => sum + row.template.amount, 0);
}

/**
 * Calculate total matched amount from projection rows
 */
export function matchedTotal(rows: ScheduledProjectionRow[]): number {
  return rows
    .filter((row) => row.status === "matched")
    .reduce((sum, row) => sum + (row.matchedAmount ?? 0), 0);
}

/**
 * Calculate total missing amount from projection rows
 */
export function missingTotal(rows: ScheduledProjectionRow[]): number {
  return rows
    .filter((row) => row.status === "missing")
    .reduce((sum, row) => sum + row.template.amount, 0);
}
