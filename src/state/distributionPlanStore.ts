import type { DistributionPlan } from "../types/distribution";
import { CATEGORIES, type CategoryName } from "../constants/categories";

const KEY = "stewardly_distribution_plan";

type Listener = () => void;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function safeParse<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Ensures:
 * - Every canonical category exists in plan.targets
 * - Targets are in canonical order
 * - targetPct is a finite number (defaults to 0)
 */
function normalizePlan(plan: DistributionPlan): DistributionPlan {
  const existing = new Map<CategoryName, number>();

  for (const t of plan.targets ?? []) {
    const cat = t?.category as CategoryName | undefined;
    const pct = Number(t?.targetPct ?? 0);
    if (cat) existing.set(cat, Number.isFinite(pct) ? pct : 0);
  }

  const targets = CATEGORIES.map((category) => ({
    category,
    targetPct: existing.get(category) ?? 0,
  }));

  return {
    ...plan,
    targets,
  };
}

function needsRewrite(raw: DistributionPlan, normalized: DistributionPlan): boolean {
  if ((raw.targets?.length ?? 0) !== normalized.targets.length) return true;

  for (let i = 0; i < normalized.targets.length; i++) {
    const r = raw.targets[i];
    const n = normalized.targets[i];

    // If order differs or missing/extra categories, rewrite
    if (!r || r.category !== n.category) return true;

    // Ensure numeric integrity
    if (typeof r.targetPct !== "number" || !Number.isFinite(r.targetPct)) return true;
  }

  return false;
}

export function getDistributionPlan(): DistributionPlan | null {
  const raw = safeParse<DistributionPlan>(localStorage.getItem(KEY));
  if (!raw) return null;

  const normalized = normalizePlan(raw);

  // Auto-migrate only when needed
  if (needsRewrite(raw, normalized)) {
    localStorage.setItem(KEY, JSON.stringify(normalized));
  }

  return normalized;
}

export function setDistributionPlan(plan: DistributionPlan) {
  const normalized = normalizePlan(plan);
  localStorage.setItem(KEY, JSON.stringify(normalized));
  notify();
}

export function clearDistributionPlan() {
  localStorage.removeItem(KEY);
  notify();
}

export function subscribeDistributionPlan(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener); // ignore boolean return
  };
}
