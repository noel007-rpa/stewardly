import type { IncomeRecord, IncomeInput } from "../types/income";
import { getPeriodKeyFromDate, assertPeriodUnlockedOrThrow } from "../utils/lockGuard";

const KEY = "stewardly_income";

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

function normalizeIncome(i: any): IncomeRecord | null {
  if (!i || typeof i !== "object") return null;

  const amount = Number(i.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const frequency = i.frequency === "oneTime" || i.frequency === "monthly" || i.frequency === "yearly" 
    ? i.frequency 
    : "oneTime";

  const status = i.status === "active" || i.status === "paused" 
    ? i.status 
    : "active";

  const name = String(i.name ?? "").trim();
  if (!name) return null;

  const currency = String(i.currency ?? "").trim();
  if (!currency) return null;

  const date = String(i.date ?? "").trim();
  if (!date) return null;

  return {
    id: String(i.id),
    date,
    name,
    amount,
    currency,
    frequency,
    startDate: i.startDate ? String(i.startDate).trim() : undefined,
    endDate: i.endDate ? String(i.endDate).trim() : undefined,
    note: i.note ? String(i.note).trim() : undefined,
    status,
    createdAt: String(i.createdAt),
    updatedAt: String(i.updatedAt),
  };
}

function normalizeAll(items: any[]): IncomeRecord[] {
  return (items ?? [])
    .map(normalizeIncome)
    .filter((x): x is IncomeRecord => Boolean(x));
}

function readAll(): IncomeRecord[] {
  const raw = safeParse<any[]>(localStorage.getItem(KEY)) ?? [];
  const normalized = normalizeAll(raw);

  // Rewrite storage if anything changed / missing or invalid
  if (raw.length !== normalized.length) {
    localStorage.setItem(KEY, JSON.stringify(normalized));
  }

  return normalized;
}

function writeAll(items: IncomeRecord[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  notify();
}

export function subscribeIncome(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function listIncome(): IncomeRecord[] {
  return readAll().sort((a, b) => {
    // Sort by date descending
    if (a.date !== b.date) {
      return a.date < b.date ? 1 : -1;
    }
    // Then by createdAt descending
    return a.createdAt < b.createdAt ? 1 : -1;
  });
}

export function addIncome(input: IncomeInput): { ok: true; id: string } | { ok: false; reason: string } {
  // Validation
  const name = String(input.name ?? "").trim();
  if (!name) {
    return { ok: false, reason: "Income name is required" };
  }

  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Income amount must be greater than 0" };
  }

  const currency = String(input.currency ?? "").trim();
  if (!currency) {
    return { ok: false, reason: "Income currency is required" };
  }

  const date = String(input.date ?? "").trim();
  if (!date) {
    return { ok: false, reason: "Income date is required" };
  }

  // Check if the income's period is locked
  try {
    const periodKey = getPeriodKeyFromDate(date);
    assertPeriodUnlockedOrThrow(periodKey, "add income");
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  // Generate ID
  const id = (() => {
    try {
      return crypto.randomUUID();
    } catch {
      return `income_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
  })();

  const now = new Date().toISOString();

  const newIncome: IncomeRecord = {
    id,
    date,
    name,
    amount,
    currency,
    frequency: input.frequency,
    startDate: input.startDate,
    endDate: input.endDate,
    note: input.note,
    status: input.status,
    createdAt: now,
    updatedAt: now,
  };

  const items = readAll();
  items.push(newIncome);
  writeAll(items);

  return { ok: true, id };
}

export function updateIncome(
  id: string,
  patch: Partial<IncomeInput>
): { ok: true } | { ok: false; reason: string } {
  const items = readAll();
  const index = items.findIndex((i) => i.id === id);

  if (index === -1) {
    return { ok: false, reason: "Income record not found" };
  }

  const current = items[index];

  // Determine the effective date (patch.date or existing date)
  const effectiveDate = patch.date ?? current.date;

  // Check if the effective period is locked (old and new periods both unlocked)
  try {
    const oldPeriodKey = getPeriodKeyFromDate(current.date);
    const newPeriodKey = getPeriodKeyFromDate(effectiveDate);
    assertPeriodUnlockedOrThrow(oldPeriodKey, "edit income");
    assertPeriodUnlockedOrThrow(newPeriodKey, "edit income");
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  // Merge patch with current, validating key fields if provided
  const updated: IncomeRecord = {
    ...current,
    ...patch,
    id: current.id, // Ensure id doesn't change
    createdAt: current.createdAt, // Ensure createdAt doesn't change
    updatedAt: new Date().toISOString(),
  };

  // Validate required fields after merge
  const name = String(updated.name ?? "").trim();
  if (!name) {
    return { ok: false, reason: "Income name is required" };
  }

  const amount = Number(updated.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Income amount must be greater than 0" };
  }

  const currency = String(updated.currency ?? "").trim();
  if (!currency) {
    return { ok: false, reason: "Income currency is required" };
  }

  const date = String(updated.date ?? "").trim();
  if (!date) {
    return { ok: false, reason: "Income date is required" };
  }

  items[index] = updated;
  writeAll(items);

  return { ok: true };
}

export function deleteIncome(id: string): { ok: true } | { ok: false; reason: string } {
  const items = readAll();
  const index = items.findIndex((i) => i.id === id);

  if (index === -1) {
    return { ok: false, reason: "Income record not found" };
  }

  const record = items[index];

  // Check if the record's period is locked
  try {
    const periodKey = getPeriodKeyFromDate(record.date);
    assertPeriodUnlockedOrThrow(periodKey, "delete income");
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }

  items.splice(index, 1);
  writeAll(items);

  return { ok: true };
}

export function clearIncome() {
  localStorage.removeItem(KEY);
  notify();
}
