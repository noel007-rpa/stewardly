/**
 * Distribution Plans Store
 * Manages multiple distribution plans with one active plan using localStorage
 * Patterns: safeParse, normalizePlan, listeners + notify
 */
import type { DistributionPlan } from "../types/distribution";
import { CATEGORIES, type CategoryName } from "../constants/categories";

const KEY_PLANS = "stewardly_distribution_plans";
const KEY_ACTIVE = "stewardly_active_plan_id";

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
 * - updatedAt is a valid ISO string (defaults to now if missing/invalid)
 * - currency defaults to "SGD" if missing
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

  // Ensure updatedAt is a valid ISO string
  let updatedAt = plan.updatedAt;
  if (!updatedAt || typeof updatedAt !== "string") {
    updatedAt = new Date().toISOString();
  } else {
    // Validate it's a valid ISO string by parsing it
    try {
      new Date(updatedAt).toISOString();
    } catch {
      updatedAt = new Date().toISOString();
    }
  }

  // Default currency to SGD if missing
  const currency = plan.currency && typeof plan.currency === "string" ? plan.currency : "SGD";

  return {
    ...plan,
    currency,
    targets,
    updatedAt,
  };
}

/**
 * Read all plans from localStorage (raw, unfiltered)
 */
function readAllPlans(): DistributionPlan[] {
  const raw = safeParse<DistributionPlan[]>(localStorage.getItem(KEY_PLANS));
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map(normalizePlan);
}

/**
 * Write all plans to localStorage and notify
 */
function writeAllPlans(plans: DistributionPlan[]): void {
  localStorage.setItem(KEY_PLANS, JSON.stringify(plans));
  notify();
}

/**
 * Get the active plan ID from storage
 */
function getActivePlanId(): string | null {
  return localStorage.getItem(KEY_ACTIVE) || null;
}

/**
 * Set the active plan ID in storage
 */
function setActivePlanId(planId: string): void {
  localStorage.setItem(KEY_ACTIVE, planId);
}

/**
 * Internal: Ensure there is an active plan
 * If plans exist but no active ID is set, set the first plan as active
 */
function ensureActivePlan(plans: DistributionPlan[]): void {
  if (plans.length === 0) return;
  
  const activeId = getActivePlanId();
  // If no active ID or it doesn't exist in plans, set first plan as active
  if (!activeId || !plans.find((p) => p.id === activeId)) {
    setActivePlanId(plans[0].id);
  }
}

/**
 * List all plans, sorted: active first, then by updatedAt descending
 * isActive is derived from KEY_ACTIVE (source of truth), not stored flag
 */
export function listPlans(): DistributionPlan[] {
  const plans = readAllPlans();
  const activeId = getActivePlanId();
  ensureActivePlan(plans);

  // Derive isActive from KEY_ACTIVE
  const result = plans.map((p) => ({
    ...p,
    isActive: p.id === activeId,
  }));

  return result.sort((a, b) => {
    // Active plan first
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;

    // Then by updatedAt descending (newest first)
    const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return bTime - aTime;
  });
}

/**
 * Get a single plan by ID
 * isActive is derived from KEY_ACTIVE (source of truth)
 */
export function getPlan(planId: string): DistributionPlan | null {
  const plans = readAllPlans();
  const activeId = getActivePlanId();
  
  const plan = plans.find((p) => p.id === planId);
  if (!plan) return null;
  
  return {
    ...plan,
    isActive: plan.id === activeId,
  };
}

/**
 * Get the currently active plan
 * isActive is derived from KEY_ACTIVE (source of truth)
 */
export function getActivePlan(): DistributionPlan | null {
  const plans = readAllPlans();
  const activeId = getActivePlanId();
  ensureActivePlan(plans);

  if (activeId) {
    const active = plans.find((p) => p.id === activeId);
    if (active) {
      return {
        ...active,
        isActive: true,
      };
    }
  }

  // Fallback: return first plan with isActive = true
  if (plans.length > 0) {
    return {
      ...plans[0],
      isActive: true,
    };
  }

  return null;
}

/**
 * Create a new distribution plan
 * If this is the first plan, it becomes active
 */
export function createPlan(plan: DistributionPlan): void {
  const plans = readAllPlans();
  const normalized = normalizePlan(plan);

  // Create new object without mutating normalized
  const newPlan = { ...normalized };
  plans.push(newPlan);
  writeAllPlans(plans);

  // If this is the first plan, make it active
  if (plans.length === 1) {
    setActivePlanId(newPlan.id);
  }
}

/**
 * Update an existing plan
 * isActive is derived from KEY_ACTIVE (source of truth)
 */
export function updatePlan(plan: DistributionPlan): void {
  const plans = readAllPlans();
  const index = plans.findIndex((p) => p.id === plan.id);

  if (index === -1) {
    console.warn(`[distributionPlansStore] Plan ${plan.id} not found for update`);
    return;
  }

  const normalized = normalizePlan(plan);
  plans[index] = normalized;
  writeAllPlans(plans);
}

/**
 * Duplicate a plan with a new ID
 * Duplicated plan is inactive unless it's the first plan
 */
export function duplicatePlan(sourcePlanId: string): DistributionPlan | null {
  const source = getPlan(sourcePlanId);
  if (!source) return null;

  const duplicate: DistributionPlan = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (Copy)`,
    isActive: false,
    updatedAt: new Date().toISOString(),
  };

  const plans = readAllPlans();
  plans.push(duplicate);
  writeAllPlans(plans);

  return duplicate;
}

/**
 * Delete a plan by ID
 * If the deleted plan was active, sets the first remaining plan as active
 */
export function deletePlan(planId: string): void {
  const plans = readAllPlans().filter((p) => p.id !== planId);

  // If deleted plan was active, set first remaining as active
  const activeId = getActivePlanId();
  if (activeId === planId) {
    if (plans.length > 0) {
      setActivePlanId(plans[0].id);
    } else {
      localStorage.removeItem(KEY_ACTIVE);
    }
  }

  writeAllPlans(plans);
}

/**
 * Set a plan as active (ensures exactly one active plan)
 * Uses KEY_ACTIVE as source of truth
 */
export function setActivePlan(planId: string): void {
  const plans = readAllPlans();
  const targetPlan = plans.find((p) => p.id === planId);

  if (!targetPlan) {
    console.warn(`[distributionPlansStore] Plan ${planId} not found for activation`);
    return;
  }

  setActivePlanId(planId);
  notify();
}

/**
 * Backward compatibility: get active plan
 */
export function getDistributionPlan(): DistributionPlan | null {
  return getActivePlan();
}

/**
 * Backward compatibility: set/update active plan
 */
export function setDistributionPlan(plan: DistributionPlan): void {
  const existing = getPlan(plan.id);

  if (existing) {
    // Update existing plan and make it active
    updatePlan(plan);
    setActivePlan(plan.id);
  } else {
    // Create new plan (will be active if first)
    createPlan(plan);
    setActivePlan(plan.id);
  }
}

/**
 * Clear all plans and active plan
 */
export function clearDistributionPlans(): void {
  localStorage.removeItem(KEY_PLANS);
  localStorage.removeItem(KEY_ACTIVE);
  notify();
}

/**
 * Subscribe to plan changes
 * @returns Unsubscribe function
 */
export function subscribePlans(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
