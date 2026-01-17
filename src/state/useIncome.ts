import { useEffect, useState } from "react";
import type { IncomeRecord } from "../types/income";
import { listIncome, subscribeIncome } from "./incomeStore";

export function useIncome(): IncomeRecord[] {
  const [items, setItems] = useState<IncomeRecord[]>(() => listIncome());

  useEffect(() => {
    // initial sync
    setItems(listIncome());

    // subscribe and return cleanup
    const unsubscribe = subscribeIncome(() => {
      setItems(listIncome());
    });

    return unsubscribe;
  }, []);

  return items;
}
