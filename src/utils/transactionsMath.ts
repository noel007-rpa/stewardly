import type { CategoryName } from "../constants/categories";
import type { MoneyTransaction } from "../types/transactions";

export function sumByCategory(transactions: MoneyTransaction[]) {
  const map = new Map<CategoryName, number>();

  for (const t of transactions) {
    if (t.direction !== "out") continue;
    const prev = map.get(t.category) ?? 0;
    map.set(t.category, prev + t.amount);
  }

  return map;
}

export function sumTotals(transactions: MoneyTransaction[]) {
  let totalIn = 0;
  let totalOut = 0;

  for (const t of transactions) {
    if (t.direction === "in") totalIn += t.amount;
    else totalOut += t.amount;
  }

  return { totalIn, totalOut, net: totalIn - totalOut };
}
