/**
 * useEffectiveIncome hook
 * Returns income with virtual recurring entries included (lock-aware)
 */

import { useMemo } from "react";
import { useIncome } from "./useIncome";
import { subscribeLocks } from "./periodLocksStore";
import { useState, useEffect } from "react";
import { getEffectiveIncomeForPeriod, type EffectiveIncome } from "../utils/incomeRecurrence";

/**
 * Get effective income for a specific period
 * Includes virtual recurring income if period is unlocked
 */
export function useEffectiveIncomeForPeriod(period: string): EffectiveIncome[] {
  const storedIncome = useIncome();
  const [lockTick, setLockTick] = useState(0);

  // Subscribe to lock changes to re-compute when locks change
  useEffect(() => {
    const unsubscribe = subscribeLocks(() => {
      setLockTick((x) => x + 1);
    });
    return () => unsubscribe();
  }, []);

  return useMemo(() => {
    return getEffectiveIncomeForPeriod(period, storedIncome);
    // lockTick is included to ensure re-compute when locks change
  }, [period, storedIncome, lockTick]);
}

/**
 * Get all effective income (stored + virtual for unlocked periods)
 */
export function useAllEffectiveIncome(): EffectiveIncome[] {
  const storedIncome = useIncome();
  const [lockTick, setLockTick] = useState(0);

  useEffect(() => {
    const unsubscribe = subscribeLocks(() => {
      setLockTick((x) => x + 1);
    });
    return () => unsubscribe();
  }, []);

  return useMemo(() => {
    // Collect all effective income for all periods
    const allPeriods = new Set<string>();
    
    // Add stored income periods
    storedIncome.forEach((income) => {
      const period = income.date.slice(0, 7);
      allPeriods.add(period);
    });

    // Add periods for active monthly recurring income
    storedIncome
      .filter((income) => income.frequency === "monthly" && income.status === "active")
      .forEach((income) => {
        // Add all months from startDate to endDate (or current month if no end)
        const startPeriod = income.startDate?.slice(0, 7) || "2020-01";
        const endPeriod = income.endDate?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        
        const [startYear, startMonth] = startPeriod.split("-").map(Number);
        const [endYear, endMonth] = endPeriod.split("-").map(Number);
        
        for (let y = startYear; y <= endYear; y++) {
          const startM = y === startYear ? startMonth : 1;
          const endM = y === endYear ? endMonth : 12;
          for (let m = startM; m <= endM; m++) {
            const period = `${y}-${String(m).padStart(2, "0")}`;
            allPeriods.add(period);
          }
        }
      });

    // Get effective income for each period
    const result: EffectiveIncome[] = [];
    allPeriods.forEach((period) => {
      const effective = getEffectiveIncomeForPeriod(period, storedIncome);
      result.push(...effective);
    });

    return result;
  }, [storedIncome, lockTick]);
}
