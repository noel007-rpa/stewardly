import type { DistributionPlan, DistributionTarget } from "../types/distribution";

export type AllocationLine = {
  category: DistributionTarget["category"];
  targetPct: number;
  amount: number;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeAllocations(plan: DistributionPlan, income: number): AllocationLine[] {
  const safeIncome = Number.isFinite(income) ? income : 0;

  return plan.targets.map((t) => ({
    category: t.category,
    targetPct: t.targetPct,
    amount: round2((safeIncome * t.targetPct) / 100),
  }));
}

export function sumAllocations(lines: AllocationLine[]) {
  return round2(lines.reduce((acc, x) => acc + x.amount, 0));
}
