import { useMemo, useState, useEffect } from "react";
import { addTransaction, deleteTransaction } from "../../state/transactionsStore";
import { useTransactions } from "../../state/useTransactions";
import { CATEGORIES, type CategoryName } from "../../constants/categories";
import {
  getCurrentPeriod,
  filterByPeriod,
  sumByDirection,
} from "../../utils/periods";
import { isPeriodLocked, subscribeLocks } from "../../state/periodLocksStore";
import { LockBanner } from "../../components/common/LockBanner";

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatMoney(amount: number, currency = "SGD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Get period key (YYYY-MM) from ISO date (YYYY-MM-DD)
 */
const getPeriodKeyFromDate = (date: string): string => date.slice(0, 7);

export function Transactions() {
  // ✅ IMPORTANT: your hook likely returns an object
  const items = useTransactions();

  const [date, setDate] = useState<string>(todayISO());
  const [category, setCategory] = useState<CategoryName>("Living");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [amount, setAmount] = useState<number>(0);
  const [note, setNote] = useState<string>("");
  const [lockTick, setLockTick] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  
  // Period-scoped view controls
  const [viewMode, setViewMode] = useState<"thisMonth" | "allTime" | "custom">("thisMonth");
  const [customMonth, setCustomMonth] = useState<string>(getCurrentPeriod());

  // Subscribe to lock changes for re-render
  useEffect(() => {
    const unsubscribe = subscribeLocks(() => {
      setLockTick((x) => x + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Derive selectedPeriodKey (null for all-time, YYYY-MM for specific period)
  const selectedPeriodKey = useMemo(() => {
    if (viewMode === "allTime") return null;
    if (viewMode === "custom") return customMonth;
    return getCurrentPeriod(); // thisMonth
  }, [viewMode, customMonth]);

  // Filter transactions
  const filteredItems = useMemo(() => {
    return filterByPeriod(items, selectedPeriodKey);
  }, [items, selectedPeriodKey]);

  // Calculate totals by direction
  const totals = useMemo(() => {
    return sumByDirection(filteredItems);
  }, [filteredItems]);

  // Get the period for the transaction being added
  const addDatePeriod = useMemo(() => {
    return getPeriodKeyFromDate(date);
  }, [date]);

  // Check if Add button should be locked based on the transaction date's period
  const isAddLocked = useMemo(() => isPeriodLocked(addDatePeriod), [addDatePeriod, lockTick]);

  // Check if the selected report period is locked
  const isLockedView = useMemo(
    () => (selectedPeriodKey === null ? false : isPeriodLocked(selectedPeriodKey)),
    [selectedPeriodKey, lockTick]
  );

  function onAdd() {
    if (!date) return;
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (isAddLocked) return; // Safeguard: prevent adding if locked

    const result = addTransaction({
      date,
      category,
      amount,
      direction,
      note: note.trim() ? note.trim() : undefined,
    });

    if (!result.ok) {
      setActionError(result.reason);
      setTimeout(() => setActionError(null), 4000);
      return;
    }

    setAmount(0);
    setNote("");
    setActionError(null);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>

      <LockBanner period={selectedPeriodKey} locked={isLockedView} />

      {actionError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">Error</div>
              <div className="mt-1">{actionError}</div>
            </div>
            <button
              className="ml-4 text-red-700 hover:text-red-900"
              onClick={() => setActionError(null)}
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Add transaction</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label className="text-sm text-slate-600">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isLockedView}
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium text-slate-700">Category</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryName)}
              disabled={isLockedView}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm font-medium text-slate-700">Type</label>
            <select
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              value={direction}
              onChange={(e) => {
                const d = e.target.value as "in" | "out";
                setDirection(d);

                // Lightweight UX safeguard: avoid ambiguous income/refund entries
                if (d === "in" && note.trim() === "") {
                  setNote("Income/Refund");
                }
                if (d === "out" && note.trim() === "Income/Refund") {
                  setNote("");
                }
              }}
              disabled={isLockedView}
            >
              <option value="out">Expense</option>
              <option value="in">Income / Refund</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="text-sm text-slate-600">Amount</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isLockedView}
            />
          </div>

          <div className="md:col-span-3">
            <label className="text-sm text-slate-600">Note (optional)</label>
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={direction === "in" ? "e.g. salary, refund, reimbursement" : "e.g. groceries"}
              disabled={isLockedView}
            />
          </div>
        </div>

        <div className="mt-4">
          <LockBanner period={addDatePeriod} locked={isAddLocked} />
          <button
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              amount > 0 && !isAddLocked && !isLockedView
                ? "bg-slate-900 text-white"
                : "bg-slate-200 text-slate-500 cursor-not-allowed opacity-50"
            }`}
            onClick={onAdd}
            disabled={amount <= 0 || isAddLocked || isLockedView}
          >
            Add
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Recent transactions</h2>

        {/* Period-Scoped View Controls */}
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "thisMonth"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setViewMode("thisMonth")}
            >
              This month
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "custom"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setViewMode("custom")}
            >
              Custom month
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                viewMode === "allTime"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
              onClick={() => setViewMode("allTime")}
            >
              All time
            </button>

            {viewMode === "custom" && (
              <input
                type="month"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
              />
            )}
          </div>

          {/* Period-Locked Banner */}
          <LockBanner period={selectedPeriodKey} locked={isLockedView} />
        </div>

        {/* Totals by Direction */}
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Expenses</div>
            <div className="mt-1 text-xl font-semibold text-red-700">{formatMoney(totals.totalOut)}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Income</div>
            <div className="mt-1 text-xl font-semibold text-emerald-700">{formatMoney(totals.totalIn)}</div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Net</div>
            <div className={`mt-1 text-xl font-semibold ${
              totals.net >= 0 ? "text-emerald-700" : "text-red-700"
            }`}>
              {formatMoney(totals.net)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Items</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">{filteredItems.length}</div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-3">Date</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-4">Note</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>

          <div className="divide-y divide-slate-200">
            {filteredItems.map((t) => {
              const txPeriod = getPeriodKeyFromDate(t.date);
              const isRowLocked = isPeriodLocked(txPeriod);
              return (
                <div key={t.id} className={`grid grid-cols-12 items-center px-4 py-2 text-sm ${
                  isRowLocked ? "bg-amber-50" : ""
                }`}>
                  <div className="col-span-3">{t.date}</div>
                  <div className="col-span-3">{t.category}</div>
                  <div className="col-span-4 text-slate-600">{t.note ?? "—"}</div>
                  <div className="col-span-2 text-right">
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-medium">{formatMoney(t.amount)}</span>
                      <div className="flex items-center gap-2">
                        {isRowLocked && (
                          <span className="text-xs text-amber-700">🔒 Locked</span>
                        )}
                        <button
                          className={`rounded-md border px-2 py-1 text-xs ${
                            isRowLocked
                              ? "border-slate-300 bg-slate-100 text-slate-400 cursor-not-allowed opacity-50"
                              : "border-slate-300 bg-white hover:bg-red-50"
                          }`}
                          onClick={() => {
                            if (!isRowLocked) {
                              const result = deleteTransaction(t.id);
                              if (!result.ok) {
                                setActionError(result.reason);
                                setTimeout(() => setActionError(null), 4000);
                              }
                            }
                          }}
                          disabled={isRowLocked}
                          title={isRowLocked ? "Period is locked" : "Delete"}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-600">No transactions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
