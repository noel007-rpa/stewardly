import type { IncomeRecord } from "../types/income";

export function getPeriodKeyFromDate(dateISO: string): string {
  return dateISO.slice(0, 7);
}

export function filterIncomeByPeriod(
  items: IncomeRecord[],
  periodKey: string | null
): IncomeRecord[] {
  if (periodKey === null) {
    return items;
  }
  return items.filter((record) => getPeriodKeyFromDate(record.date) === periodKey);
}

export function sumIncome(items: IncomeRecord[]): number {
  return items
    .filter((record) => record.status === "active")
    .reduce((sum, record) => sum + record.amount, 0);
}

export function sumIncomeByPeriod(items: IncomeRecord[], periodKey: string): number {
  return sumIncome(filterIncomeByPeriod(items, periodKey));
}
