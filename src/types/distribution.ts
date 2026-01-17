import type { CategoryName } from "../constants/categories";

export type DistributionTarget = {
  category: CategoryName;
  targetPct: number; // 0–100
};

export type DistributionPlan = {
  id: string;
  name: string; // e.g. "Default Plan"
  currency: string; // e.g. "SGD"
  targets: DistributionTarget[];
  updatedAt: string; // ISO
  isActive?: boolean; // true if this is the active plan
  hasSnapshots?: boolean; // true if plan has period snapshots
};
