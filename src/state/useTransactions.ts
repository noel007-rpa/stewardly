import { useEffect, useState } from "react";
import type { MoneyTransaction } from "../types/transactions";
import { listTransactions, subscribeTransactions } from "./transactionsStore";

export function useTransactions(): MoneyTransaction[] {
  const [items, setItems] = useState<MoneyTransaction[]>(() => listTransactions());

  useEffect(() => {
    // initial sync (optional but nice)
    setItems(listTransactions());

    // subscribe and return cleanup
    const unsubscribe = subscribeTransactions(() => {
      setItems(listTransactions());
    });

    return unsubscribe;
  }, []);

  return items;
}
