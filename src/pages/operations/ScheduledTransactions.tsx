import { useState, useMemo, useEffect } from "react";
import type { CategoryName } from "../../constants/categories";
import { CATEGORIES } from "../../constants/categories";
import type { ScheduledTransactionTemplate, ScheduledFrequency, ScheduledRule, ScheduledMatchMode } from "../../types/scheduled";
import { useScheduledTemplates } from "../../state/useScheduledTemplates";
import { addScheduledTemplate, updateScheduledTemplate, deleteScheduledTemplate } from "../../state/scheduledTemplatesStore";
import { useTransactions } from "../../state/useTransactions";
import { addTransaction } from "../../state/transactionsStore";
import { isPeriodLocked, subscribeLocks } from "../../state/periodLocksStore";
import { getCurrentPeriod } from "../../utils/periods";
import { projectScheduledTransactions, expectedTotal, matchedTotal, missingTotal } from "../../utils/scheduledMath";
import { LockBanner } from "../../components/common/LockBanner";
import { Tooltip } from "../../components/common/Tooltip";

function formatMoney(amount: number, currency = "SGD"): string {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function ScheduledTransactions() {
  const templates = useScheduledTemplates();
  const transactions = useTransactions();
  const [lockTick, setLockTick] = useState(0);

  // Subscribe to lock changes
  useEffect(() => {
    const unsubscribe = subscribeLocks(() => {
      setLockTick((x) => x + 1);
    });
    return () => unsubscribe();
  }, []);

  // Form state for adding/editing
  const [formMode, setFormMode] = useState<"add" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<ScheduledTransactionTemplate, "id">>({
    name: "",
    category: "Living",
    direction: "out",
    amount: 0,
    frequency: "monthly",
    rule: "dayOfMonth",
    day: 15,
    active: true,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Month selector
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentPeriod());
  const isMonthLocked = useMemo(
    () => isPeriodLocked(selectedMonth),
    [selectedMonth, lockTick]
  );

  // Project transactions for selected month
  const projectedRows = useMemo(() => {
    return projectScheduledTransactions(templates, transactions as any, selectedMonth);
  }, [templates, transactions, selectedMonth]);

  const totals = useMemo(
    () => ({
      expected: expectedTotal(projectedRows),
      matched: matchedTotal(projectedRows),
      missing: missingTotal(projectedRows),
    }),
    [projectedRows]
  );

  // Handlers
  function handleAddClick() {
    setFormMode("add");
    setEditingId(null);
    setFormData({
      name: "",
      category: "Living",
      direction: "out",
      amount: 0,
      frequency: "monthly",
      rule: "dayOfMonth",
      day: 15,
      active: true,
    });
    setFormError(null);
    setFormSuccess(null);
  }

  function handleEditClick(id: string) {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    setFormMode("edit");
    setEditingId(id);
    setFormData({
      name: template.name,
      category: template.category,
      direction: template.direction,
      amount: template.amount,
      frequency: template.frequency,
      rule: template.rule,
      day: template.day,
      active: template.active,
      note: template.note,
      matchMode: template.matchMode,
      matchKeyword: template.matchKeyword,
    });
    setFormError(null);
  }

  function handleSaveTemplate() {
    setFormError(null);
    setFormSuccess(null);

    if (formMode === "add") {
      const result = addScheduledTemplate(formData);
      if (!result.ok) {
        setFormError(result.reason);
        return;
      }
      setFormSuccess("Template added successfully");
      setFormMode(null);
      setTimeout(() => setFormSuccess(null), 2000);
    } else if (formMode === "edit" && editingId) {
      const result = updateScheduledTemplate(editingId, formData);
      if (!result.ok) {
        setFormError(result.reason);
        return;
      }
      setFormSuccess("Template updated successfully");
      setFormMode(null);
      setTimeout(() => setFormSuccess(null), 2000);
    }
  }

  function handleDeleteTemplate(id: string) {
    const result = deleteScheduledTemplate(id);
    if (!result.ok) {
      setFormError(result.reason);
      return;
    }
    setFormSuccess("Template deleted");
    setTimeout(() => setFormSuccess(null), 2000);
  }

  function handlePostTransaction(templateId: string, expectedDateISO: string) {
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;

    const result = addTransaction({
      date: expectedDateISO,
      category: template.category,
      amount: template.amount,
      direction: template.direction,
      note: template.name,
    });

    if (!result.ok) {
      setFormError(result.reason);
      return;
    }

    setFormSuccess(`Transaction posted: ${template.name}`);
    setTimeout(() => setFormSuccess(null), 2000);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Scheduled Transactions</h1>

      {formError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start justify-between">
            <div>
              <div className="font-semibold">Error</div>
              <div className="mt-1">{formError}</div>
            </div>
            <button
              className="ml-4 text-red-700 hover:text-red-900"
              onClick={() => setFormError(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {formSuccess && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="flex items-start justify-between">
            <div>{formSuccess}</div>
            <button
              className="ml-4 text-emerald-700 hover:text-emerald-900"
              onClick={() => setFormSuccess(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Add Template Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {formMode === "add" ? "Add Template" : formMode === "edit" ? "Edit Template" : "Templates"}
          </h2>
          {!formMode && (
            <button
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              onClick={handleAddClick}
            >
              + Add Template
            </button>
          )}
        </div>

        {formMode && (
          <div className="mt-6 space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Rent, Insurance"
                />
              </div>

              <div>
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-slate-700">
                    Category
                  </label>
                  <Tooltip
                    title="Category"
                    className="ml-1"
                  >
                    <div className="space-y-2">
                      <p className="text-slate-700">
                        Category tells Stewardly which budget bucket this item belongs to.
                        It is used in reports (planned vs actual) and to match scheduled items to transactions.
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>Example:</strong> Rent is usually Category: Living.
                        If you record the actual payment under a different category, it may not match.
                      </p>
                    </div>
                  </Tooltip>
                </div>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as CategoryName,
                    })
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-slate-700">
                    Direction
                  </label>
                  <Tooltip
                    title="Direction"
                    className="ml-1"
                  >
                    <div className="space-y-2">
                      <p className="text-slate-700">
                        Direction describes whether money goes OUT (Expense) or IN (Income).
                        Most scheduled items are expenses (rent, utilities, subscriptions).
                      </p>
                      <p className="text-xs text-slate-600">
                        <strong>Examples:</strong>
                      </p>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p>Expense: Rent SGD 1,800 (money out)</p>
                        <p>Income: Salary SGD 5,000 (money in)</p>
                      </div>
                    </div>
                  </Tooltip>
                </div>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.direction}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      direction: e.target.value as "in" | "out",
                    })
                  }
                >
                  <option value="out">Expense</option>
                  <option value="in">Income</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Frequency
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      frequency: e.target.value as ScheduledFrequency,
                    })
                  }
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Rule
                </label>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.rule}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rule: e.target.value as ScheduledRule,
                    })
                  }
                >
                  <option value="dayOfMonth">Day of Month</option>
                  <option value="endOfMonth">End of Month</option>
                </select>
              </div>

              {formData.rule === "dayOfMonth" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Day (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.day || 15}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        day: parseInt(e.target.value, 10) || 15,
                      })
                    }
                  />
                </div>
              )}

              <div>
                <div className="flex items-center">
                  <label className="block text-sm font-medium text-slate-700">
                    Match Mode
                  </label>
                  <Tooltip
                    title="Match Mode"
                    className="ml-1"
                  >
                    <div className="space-y-3">
                      <p className="text-slate-700">
                        Match Mode controls how Stewardly decides whether a scheduled item has already been recorded as a real transaction.
                      </p>
                      <div className="space-y-2">
                        <div>
                          <div className="font-medium text-slate-900">• Amount Only</div>
                          <p className="text-xs text-slate-600">
                            Matches when a transaction with the same amount exists in the same month.
                          </p>
                          <p className="text-xs text-slate-500 italic">
                            Example: Scheduled Rent = SGD 1,800; Transaction: Living – SGD 1,800 → Matched
                          </p>
                        </div>

                        <div>
                          <div className="font-medium text-slate-900">• Keyword</div>
                          <p className="text-xs text-slate-600">
                            Matches when the transaction note contains a keyword.
                          </p>
                          <p className="text-xs text-slate-500 italic">
                            Example: Keyword = 'netflix'; Transaction note: 'Netflix subscription' → Matched
                          </p>
                        </div>

                        <div>
                          <div className="font-medium text-slate-900">• Both (Amount + Keyword)</div>
                          <p className="text-xs text-slate-600">
                            Matches only when BOTH amount and keyword match.
                          </p>
                          <p className="text-xs text-slate-500 italic">
                            Example: Amount = SGD 120, Keyword = 'insurance'; Transaction: SGD 120 – note 'Insurance premium' → Matched
                          </p>
                        </div>
                      </div>
                    </div>
                  </Tooltip>
                </div>
                <select
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.matchMode || "amountOnly"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      matchMode: e.target.value as ScheduledMatchMode,
                    })
                  }
                >
                  <option value="amountOnly">Amount Only</option>
                  <option value="keyword">Keyword</option>
                  <option value="both">Both (Amount + Keyword)</option>
                </select>
              </div>

              {(formData.matchMode === "keyword" ||
                formData.matchMode === "both") && (
                <div>
                  <label className="block text-sm font-medium text-slate-700">
                    Match Keyword
                  </label>
                  <input
                    type="text"
                    className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={formData.matchKeyword || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        matchKeyword: e.target.value,
                      })
                    }
                    placeholder="e.g., rent, insurance"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  Note (optional)
                </label>
                <input
                  type="text"
                  className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={formData.note || ""}
                  onChange={(e) =>
                    setFormData({ ...formData, note: e.target.value })
                  }
                  placeholder="Additional notes"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                />
                Active
              </label>
            </div>

            <div className="flex gap-3">
              <button
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                onClick={handleSaveTemplate}
              >
                {formMode === "add" ? "Add" : "Update"}
              </button>
              <button
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                onClick={() => setFormMode(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Template List */}
      {formMode === null && templates.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h2 className="mb-4 text-lg font-semibold">Active Templates</h2>
          <div className="space-y-2">
            {templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {template.name}
                  </div>
                  <div className="text-xs text-slate-600">
                    {template.category} • {template.direction === "out" ? "Expense" : "Income"} •{" "}
                    {formatMoney(template.amount)} • {template.frequency}{" "}
                    {!template.active && "• (Inactive)"}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100"
                    onClick={() => handleEditClick(template.id)}
                  >
                    Edit
                  </button>
                  <button
                    className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Projection View */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Monthly Projection</h2>
          <input
            type="month"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>

        <LockBanner period={selectedMonth} locked={isMonthLocked} />

        {/* Totals */}
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Expected</div>
            <div className="mt-1 text-xl font-semibold text-slate-900">
              {formatMoney(totals.expected)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-emerald-50 p-4">
            <div className="text-sm text-emerald-700">Matched</div>
            <div className="mt-1 text-xl font-semibold text-emerald-700">
              {formatMoney(totals.matched)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-amber-50 p-4">
            <div className="text-sm text-amber-700">Missing</div>
            <div className="mt-1 text-xl font-semibold text-amber-700">
              {formatMoney(totals.missing)}
            </div>
          </div>
        </div>

        {/* Projection Table */}
        <div className="mt-6 rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-3">Name</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-2 flex items-center">
              <span>Expected Date</span>
              <Tooltip
                title="Expected Date"
                className="ml-1"
              >
                <div className="space-y-2">
                  <p className="text-slate-700">
                    This is the date Stewardly expects this scheduled transaction to occur
                    based on its schedule rule (day of month or end of month).
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-900">Example:</span> If Rent is scheduled for 'End of Month',
                    the expected date for January 2026 is Jan 31, 2026.
                  </p>
                </div>
              </Tooltip>
            </div>
            <div className="col-span-2 flex items-center justify-end">
              <Tooltip
                title="Expected Amount"
                className="ml-1"
              >
                <div className="space-y-2">
                  <p className="text-slate-700">
                    This is the planned amount for this scheduled transaction.
                    It represents what you expect to pay or receive for this item.
                  </p>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium text-slate-900">Example:</span> Rent expected = SGD 2,000.
                    If the actual transaction is SGD 2,000, it will be marked as matched.
                  </p>
                </div>
              </Tooltip>
              <span>Expected</span>
            </div>
            <div className="col-span-2 flex items-center justify-end">
              <Tooltip
                title="Status / Action"
                className="ml-1"
              >
                <div className="space-y-2">
                  <p className="text-slate-700">
                    This shows whether the scheduled transaction has already been recorded
                    as a real transaction for the selected month.
                  </p>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="font-medium text-slate-900">Statuses:</p>
                    <p>• Missing – No matching transaction found yet.</p>
                    <p>• Matched – A matching transaction already exists.</p>
                    <p>• Inactive – This scheduled item is turned off.</p>
                  </div>
                  <div className="text-xs text-slate-600">
                    <p className="font-medium text-slate-900">Action:</p>
                    <p>When missing and the month is unlocked, you can click 'Post'
                    to create the actual transaction automatically.</p>
                  </div>
                  <p className="text-xs text-slate-600 italic">
                    <span className="font-medium text-slate-900">Example:</span> Rent shows 'Matched' after you post or record the rent payment.
                  </p>
                </div>
              </Tooltip>
              <span>Status / Action</span>
            </div>
          </div>
          <div className="overflow-hidden">
            <div className="divide-y divide-slate-200">
            {projectedRows.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-600">
                No active templates for this period.
              </div>
            ) : (
              projectedRows.map((row) => (
                <div key={row.template.id} className="grid grid-cols-12 items-center px-4 py-2 text-sm">
                  <div className="col-span-3 font-medium text-slate-900">
                    {row.template.name}
                  </div>
                  <div className="col-span-2 text-slate-600">
                    {row.template.category}
                  </div>
                  <div className="col-span-2 text-slate-600">
                    {row.expectedDateISO}
                  </div>
                  <div className="col-span-2 text-right font-medium text-slate-900">
                    {formatMoney(row.template.amount)}
                  </div>
                  <div className="col-span-2 flex justify-end gap-2">
                    {row.status === "matched" && (
                      <span className="text-xs font-medium text-emerald-700">
                        ✓ Matched
                      </span>
                    )}
                    {row.status === "missing" && (
                      <>
                        {!isMonthLocked ? (
                          <button
                            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-100"
                            onClick={() =>
                              handlePostTransaction(
                                row.template.id,
                                row.expectedDateISO
                              )
                            }
                          >
                            Post
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">🔒 Locked</span>
                        )}
                      </>
                    )}
                    {row.status === "inactive" && (
                      <span className="text-xs text-slate-400">Inactive</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
