import { useMemo, useState, useEffect } from "react";
import { useIncome } from "../../state/useIncome";
import { addIncome, updateIncome, deleteIncome } from "../../state/incomeStore";
import { useDistributionPlan } from "../../state/useDistributionPlan";
import { getCurrentPeriod } from "../../utils/periods";
import { filterIncomeByPeriod, sumIncome } from "../../utils/incomeMath";
import { isPeriodLocked, subscribeLocks } from "../../state/periodLocksStore";
import type { IncomeRecord, IncomeInput } from "../../types/income";
import { LockBanner } from "../../components/common/LockBanner";
import { getEffectiveIncomeForPeriod, type EffectiveIncome } from "../../utils/incomeRecurrence";

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

function formatDate(dateStr: string) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getPeriodKeyFromDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/**
 * Normalize a monthly income date based on the pay rule
 * @param dateISO - Current date in YYYY-MM-DD format
 * @param rule - "dayOfMonth" or "endOfMonth"
 * @param day - Day of month (1-31), only used if rule is "dayOfMonth"
 * @returns Normalized ISO date string
 */
function normalizeMonthlyDate(dateISO: string, rule: "dayOfMonth" | "endOfMonth", day?: number): string {
  const [yyyy, mm] = dateISO.slice(0, 7).split("-");
  const year = parseInt(yyyy, 10);
  const month = parseInt(mm, 10);
  
  if (rule === "endOfMonth") {
    const lastDay = new Date(year, month, 0).getDate();
    const dd = String(lastDay).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  
  // rule === "dayOfMonth"
  const targetDay = day ?? parseInt(dateISO.slice(8, 10), 10);
  const lastDay = new Date(year, month, 0).getDate();
  const clampedDay = Math.min(targetDay, lastDay);
  const dd = String(clampedDay).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function IncomeList() {
  const income = useIncome();
  const plan = useDistributionPlan();

  // Form state for adding income
  const [date, setDate] = useState<string>(todayISO());
  const [name, setName] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>(plan?.currency ?? "SGD");
  const [frequency, setFrequency] = useState<"oneTime" | "monthly" | "yearly">("oneTime");
  const [status, setStatus] = useState<"active" | "paused">("active");
  const [note, setNote] = useState<string>("");
  const [monthlyPayRule, setMonthlyPayRule] = useState<"dayOfMonth" | "endOfMonth">("dayOfMonth");
  const [monthlyPayDay, setMonthlyPayDay] = useState<number>(new Date().getDate());

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<IncomeInput>>({});

  // Error state
  const [error, setError] = useState<string | null>(null);

  // View mode and lock state
  const [viewMode, setViewMode] = useState<"thisMonth" | "allTime" | "custom">("thisMonth");
  const [customMonth, setCustomMonth] = useState<string>(getCurrentPeriod());
  const [lockTick, setLockTick] = useState(0);

  // Subscribe to lock changes
  useEffect(() => {
    const unsubscribe = subscribeLocks(() => {
      setLockTick((x) => x + 1);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Derive selectedPeriodKey
  const selectedPeriodKey = useMemo(() => {
    if (viewMode === "allTime") return null;
    if (viewMode === "custom") return customMonth;
    return getCurrentPeriod();
  }, [viewMode, customMonth]);

  // Check if current view is locked
  const isLockedView = useMemo(
    () => (selectedPeriodKey ? isPeriodLocked(selectedPeriodKey) : false),
    [selectedPeriodKey, lockTick]
  );

  // Filter income
  const filteredIncome = useMemo(() => {
    if (!selectedPeriodKey) {
      // For allTime, use raw stored income
      return filterIncomeByPeriod(income, null);
    }
    // For specific period, get effective income (stored + virtual recurring)
    return getEffectiveIncomeForPeriod(selectedPeriodKey, income);
  }, [income, selectedPeriodKey, lockTick]);

  // Calculate total
  const totalIncome = useMemo(() => sumIncome(filteredIncome), [filteredIncome]);

  // Validation for add form
  const canAdd = useMemo(() => {
    return date && name.trim() && amount > 0 && currency.trim();
  }, [date, name, amount, currency]);

  // Check if Add button should be locked based on the date being entered
  const isAddDateLocked = useMemo(() => {
    if (!date) return false;
    const addDatePeriod = getPeriodKeyFromDate(date);
    return isPeriodLocked(addDatePeriod);
  }, [date, lockTick]);

  function handleAdd() {
    if (!canAdd) return;
    if (isAddDateLocked) return; // Safeguard: prevent adding if date's period is locked

    // Normalize date for monthly frequency
    let normalizedDate = date;
    if (frequency === "monthly") {
      normalizedDate = normalizeMonthlyDate(date, monthlyPayRule, monthlyPayDay);
    }

    const result = addIncome({
      date: normalizedDate,
      name: name.trim(),
      amount,
      currency: currency.trim(),
      frequency,
      status,
      note: note.trim() || undefined,
      monthlyPayRule: frequency === "monthly" ? monthlyPayRule : undefined,
      monthlyPayDay: frequency === "monthly" && monthlyPayRule === "dayOfMonth" ? monthlyPayDay : undefined,
    });

    if (!result.ok) {
      setError(result.reason);
      setTimeout(() => setError(null), 4000);
      return;
    }

    setDate(todayISO());
    setName("");
    setAmount(0);
    setCurrency(plan?.currency ?? "SGD");
    setFrequency("oneTime");
    setStatus("active");
    setNote("");
    setMonthlyPayRule("dayOfMonth");
    setMonthlyPayDay(new Date().getDate());
    setError(null);
  }

  function getRowPeriod(recordDate: string): string {
    return recordDate.slice(0, 7);
  }

  function isRowLocked(record: IncomeRecord): boolean {
    const rowPeriod = getRowPeriod(record.date);
    return isPeriodLocked(rowPeriod);
  }

  function isRowVirtual(record: EffectiveIncome): boolean {
    return record.isVirtual === true;
  }

  function handleDelete(id: string) {
    // Find the record to check if it's locked or virtual
    const record = filteredIncome.find((r) => r.id === id);
    if (record && isRowLocked(record)) {
      setError("Cannot delete: this period is locked.");
      setTimeout(() => setError(null), 4000);
      return;
    }
    if (record && isRowVirtual(record)) {
      setError("Cannot delete: this is a recurring income instance. Edit the recurring income entry to modify.");
      setTimeout(() => setError(null), 4000);
      return;
    }

    if (window.confirm("Delete this income record?")) {
      const result = deleteIncome(id);
      if (!result.ok) {
        setError(result.reason);
        setTimeout(() => setError(null), 4000);
      }
    }
  }

  function handleStartEdit(record: EffectiveIncome) {
    if (isRowLocked(record)) {
      setError("Cannot edit: this period is locked.");
      setTimeout(() => setError(null), 4000);
      return;
    }
    if (isRowVirtual(record)) {
      setError("Cannot edit: this is a recurring income instance. Edit the recurring income entry to modify.");
      setTimeout(() => setError(null), 4000);
      return;
    }

    setEditingId(record.id);
    setEditDraft({
      date: record.date,
      name: record.name,
      amount: record.amount,
      currency: record.currency,
      frequency: record.frequency,
      status: record.status,
      note: record.note,
      monthlyPayRule: record.monthlyPayRule,
      monthlyPayDay: record.monthlyPayDay,
    });
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditDraft({});
  }

  function handleSaveEdit(id: string) {
    // Find the record to check if it's locked
    const record = income.find((r) => r.id === id);
    if (record && isRowLocked(record)) {
      setError("Cannot save: this period is locked.");
      setTimeout(() => setError(null), 4000);
      setEditingId(null);
      setEditDraft({});
      return;
    }

    // Normalize date for monthly frequency
    const patchToSave = { ...editDraft };
    if (editDraft.frequency === "monthly" && editDraft.date) {
      const rule = (editDraft.monthlyPayRule as "dayOfMonth" | "endOfMonth") ?? "dayOfMonth";
      const day = editDraft.monthlyPayDay as number | undefined;
      patchToSave.date = normalizeMonthlyDate(editDraft.date, rule, day);
    }

    const result = updateIncome(id, patchToSave);
    if (!result.ok) {
      setError(result.reason);
      setTimeout(() => setError(null), 4000);
      return;
    }
    setEditingId(null);
    setEditDraft({});
    setError(null);
  }

  function handleEditChange(key: keyof IncomeInput, value: any) {
    setEditDraft((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const displayCurrency = currency || "SGD";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Income</h1>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Error</div>
          <div className="mt-1">{error}</div>
        </div>
      )}

      <LockBanner period={selectedPeriodKey} locked={isLockedView} />

      {/* Add Income Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Add income</h2>

        <LockBanner period={getPeriodKeyFromDate(date)} locked={isAddDateLocked} />

        <div className="mt-4 grid gap-4 md:grid-cols-12">
          {/* Row 1: Date, Name, Amount */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600">Date</label>
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isLockedView}
            />
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-600">Name</label>
            <input
              type="text"
              placeholder="e.g., Salary"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLockedView}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600">Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              disabled={isLockedView}
            />
          </div>

          {/* Row 2: Frequency (with conditional Pay rule/Day), Currency */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600">Frequency</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "oneTime" | "monthly" | "yearly")}
              disabled={isLockedView}
            >
              <option value="oneTime">One-time</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            {frequency === "monthly" && (
              <p className="mt-1 text-xs text-slate-500">Pay rule applies per month</p>
            )}
          </div>

          {frequency === "monthly" && (
            <>
              <div className={monthlyPayRule === "endOfMonth" ? "md:col-span-6" : "md:col-span-3"}>
                <label className="block text-xs font-medium text-slate-600">Pay rule</label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                  value={monthlyPayRule}
                  onChange={(e) => setMonthlyPayRule(e.target.value as "dayOfMonth" | "endOfMonth")}
                  disabled={isLockedView}
                >
                  <option value="dayOfMonth">Day of month</option>
                  <option value="endOfMonth">End of month</option>
                </select>
              </div>

              {monthlyPayRule === "dayOfMonth" && (
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-slate-600">Day (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
                    value={monthlyPayDay}
                    onChange={(e) => setMonthlyPayDay(Math.max(1, Math.min(31, Number(e.target.value))))}
                    disabled={isLockedView}
                  />
                </div>
              )}
            </>
          )}

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600">Currency</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              disabled={isLockedView}
            >
              <option value="SGD">SGD</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="JPY">JPY</option>
              <option value="AUD">AUD</option>
              <option value="CAD">CAD</option>
              <option value="CNY">CNY</option>
              <option value="PHP">PHP</option>
            </select>
          </div>

          {/* Row 3: Status, Note, Add Button */}
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600">Status</label>
            <select
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={status}
              onChange={(e) => setStatus(e.target.value as "active" | "paused")}
              disabled={isLockedView}
            >
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="block text-xs font-medium text-slate-600">Note (optional)</label>
            <input
              type="text"
              placeholder="e.g., Day job"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-500"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isLockedView}
            />
          </div>

          <div className="md:col-span-3 flex items-end justify-end">
            <button
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAdd}
              disabled={!canAdd || isLockedView || isAddDateLocked}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Income Records Card */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Income records</h2>

        {/* Period Controls */}
        <div className="mt-4 flex items-center gap-2">
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              viewMode === "thisMonth"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setViewMode("thisMonth")}
          >
            This month
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              viewMode === "custom"
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setViewMode("custom")}
          >
            Custom
          </button>
          <button
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
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

        {/* Summary */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Total Income</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {formatMoney(totalIncome, displayCurrency)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Items</div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              {filteredIncome.length}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          {filteredIncome.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">
              No income records
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredIncome.map((record) => (
                <div key={record.id}>
                  {editingId === record.id ? (
                    // Edit mode
                    <div className="grid grid-cols-12 gap-2 bg-amber-50 px-4 py-3 text-sm items-center">
                      <div className="col-span-1">
                        <input
                          type="date"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          value={editDraft.date || ""}
                          onChange={(e) => handleEditChange("date", e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          value={editDraft.name || ""}
                          onChange={(e) => handleEditChange("name", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1">
                        <select
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          value={editDraft.frequency || "oneTime"}
                          onChange={(e) =>
                            handleEditChange("frequency", e.target.value as "oneTime" | "monthly" | "yearly")
                          }
                        >
                          <option value="oneTime">One-time</option>
                          <option value="monthly">Monthly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                      </div>
                      {editDraft.frequency === "monthly" && (
                        <>
                          <div className="col-span-1">
                            <select
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                              value={editDraft.monthlyPayRule || "dayOfMonth"}
                              onChange={(e) =>
                                handleEditChange("monthlyPayRule", e.target.value as "dayOfMonth" | "endOfMonth")
                              }
                            >
                              <option value="dayOfMonth">Day</option>
                              <option value="endOfMonth">EOM</option>
                            </select>
                          </div>
                          {editDraft.monthlyPayRule === "dayOfMonth" && (
                            <div className="col-span-1">
                              <input
                                type="number"
                                min="1"
                                max="31"
                                className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                                value={editDraft.monthlyPayDay || ""}
                                onChange={(e) =>
                                  handleEditChange("monthlyPayDay", Math.max(1, Math.min(31, Number(e.target.value))))
                                }
                              />
                            </div>
                          )}
                        </>
                      )}
                      <div className="col-span-1">
                        <select
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          value={editDraft.status || "active"}
                          onChange={(e) => handleEditChange("status", e.target.value as "active" | "paused")}
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          value={editDraft.note || ""}
                          onChange={(e) => handleEditChange("note", e.target.value)}
                        />
                      </div>
                      <div className="col-span-1 text-right">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                          value={editDraft.amount || ""}
                          onChange={(e) => handleEditChange("amount", Number(e.target.value))}
                        />
                      </div>
                      <div className="col-span-3 flex gap-2 justify-end">
                        <button
                          className="rounded bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          onClick={() => handleSaveEdit(record.id)}
                        >
                          Save
                        </button>
                        <button
                          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          onClick={handleCancelEdit}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="grid grid-cols-12 gap-2 px-4 py-3 text-sm items-center">
                      <div className="col-span-1 text-slate-600">
                        {formatDate(record.date)}
                      </div>
                      <div className="col-span-2 font-medium text-slate-900">
                        {record.name}
                      </div>
                      <div className="col-span-1 text-slate-600">
                        <div>
                          {record.frequency === "oneTime"
                            ? "One-time"
                            : record.frequency === "monthly"
                              ? "Monthly"
                              : "Yearly"}
                        </div>
                        {record.frequency === "monthly" && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {record.monthlyPayRule === "endOfMonth"
                              ? "EOM"
                              : `Day ${record.monthlyPayDay || parseInt(record.date.slice(8, 10), 10)}`}
                          </div>
                        )}
                      </div>
                      <div className="col-span-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                            record.status === "active"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {record.status === "active" ? "Active" : "Paused"}
                        </span>
                      </div>
                      <div className="col-span-2 text-slate-600">
                        {record.note || "-"}
                      </div>
                      <div className="col-span-1 text-right font-semibold text-emerald-700">
                        {formatMoney(record.amount, record.currency)}
                      </div>
                      <div className="col-span-4 flex justify-end gap-2 items-center">
                        {(record as EffectiveIncome).isVirtual && (
                          <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full">
                            Recurring
                          </span>
                        )}
                        {isRowLocked(record) && (
                          <span className="text-xs text-amber-700 font-semibold">🔒 Locked</span>
                        )}
                        <button
                          className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleStartEdit(record as EffectiveIncome)}
                          disabled={isRowLocked(record) || (record as EffectiveIncome).isVirtual}
                          title={(record as EffectiveIncome).isVirtual ? "Cannot edit recurring instances" : undefined}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border border-red-300 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDelete(record.id)}
                          disabled={isRowLocked(record) || (record as EffectiveIncome).isVirtual}
                          title={(record as EffectiveIncome).isVirtual ? "Cannot delete recurring instances" : undefined}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
