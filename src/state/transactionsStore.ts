import type { MoneyTransaction } from "../types/transactions";
import { getPeriodKeyFromDate, assertPeriodUnlockedOrThrow } from "../utils/lockGuard";

const KEY = "stewardly_transactions";

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

function normalizeTransaction(t: any): MoneyTransaction | null {
  if (!t || typeof t !== "object") return null;

  const amount = Number(t.amount ?? 0);
  if (!Number.isFinite(amount)) return null;

  const direction: MoneyTransaction["direction"] =
    t.direction === "in" || t.direction === "out" ? t.direction : "out";

  const noteVal = typeof t.note === "string" ? t.note.trim() : "";

  return {
    id: String(t.id),
    date: String(t.date),
    category: t.category,
    amount: Math.abs(amount),
    direction,
    note: noteVal || (direction === "in" ? "Income/Refund" : undefined),
  };
}

function normalizeAll(items: any[]): MoneyTransaction[] {
  return (items ?? [])
    .map(normalizeTransaction)
    .filter((x): x is MoneyTransaction => Boolean(x));
}

function readAll(): MoneyTransaction[] {
  const raw = safeParse<any[]>(localStorage.getItem(KEY)) ?? [];
  const normalized = normalizeAll(raw);

  // Optional: rewrite storage if anything changed / missing direction
  if (raw.length !== normalized.length || raw.some((t) => !t?.direction)) {
    localStorage.setItem(KEY, JSON.stringify(normalized));
  }

  return normalized;
}

function writeAll(items: MoneyTransaction[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  notify();
}

export function listTransactions(): MoneyTransaction[] {
  return readAll().sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function addTransaction(tx: Omit<MoneyTransaction, "id">) {
  // Check if the transaction's period is locked
  try {
    const periodKey = getPeriodKeyFromDate(tx.date);
    assertPeriodUnlockedOrThrow(periodKey, "add transaction");
  } catch (err) {
    return { ok: false as const, reason: (err as Error).message };
  }

  const direction: MoneyTransaction["direction"] =
    tx.direction === "in" || tx.direction === "out" ? tx.direction : "out";

  const amount = Math.abs(Number(tx.amount ?? 0));

  const noteVal = typeof tx.note === "string" ? tx.note.trim() : "";
  const note = noteVal || (direction === "in" ? "Income/Refund" : undefined);

  const newTx: MoneyTransaction = {
    ...tx,
    id: crypto.randomUUID(),
    amount,
    direction,
    note,
  };

  const items = readAll();
  items.push(newTx);
  writeAll(items);
  return { ok: true as const };
}

export function deleteTransaction(id: string) {
  const items = readAll();
  const txToDelete = items.find((t) => t.id === id);

  if (!txToDelete) {
    return { ok: false as const, reason: "Transaction not found" };
  }

  // Check if the transaction's period is locked
  try {
    const periodKey = getPeriodKeyFromDate(txToDelete.date);
    assertPeriodUnlockedOrThrow(periodKey, "delete transaction");
  } catch (err) {
    return { ok: false as const, reason: (err as Error).message };
  }

  const filtered = items.filter((t) => t.id !== id);
  writeAll(filtered);
  return { ok: true as const };
}

export function clearTransactions() {
  localStorage.removeItem(KEY);
  notify();
}

export function subscribeTransactions(listener: Listener): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

