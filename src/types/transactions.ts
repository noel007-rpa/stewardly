import type { CategoryName } from "../constants/categories";

export type TransactionDirection = "out" | "in";

export type MoneyTransaction = {
  id: string;
  date: string; // YYYY-MM-DD
  category: CategoryName;
  amount: number; // always positive
  direction: TransactionDirection;
  note?: string;
};
