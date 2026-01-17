// Install dependencies: npm i jspdf html2canvas
import { useMemo, useState, useEffect } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useTransactions } from "../../state/useTransactions";
import { useIncome } from "../../state/useIncome";
import { useScheduledTemplates } from "../../state/useScheduledTemplates";
import { sumByCategory } from "../../utils/transactionsMath";
import { filterIncomeByPeriod, sumIncome } from "../../utils/incomeMath";
import {
  getCurrentPeriod,
  filterTransactionsByPeriod,
} from "../../utils/periods";
import { getSnapshot, subscribeSnapshots } from "../../state/periodSnapshotStore";
import { getPlanForPeriod } from "../../utils/snapshotHelper";
import {
  hasSnapshot,
  regenerateSnapshot,
  lockPeriod,
  unlockPeriod,
} from "../../state/periodLockService";
import { isPeriodLocked, subscribeLocks } from "../../state/periodLocksStore";
import { projectScheduledTransactions, expectedTotal, matchedTotal, missingTotal } from "../../utils/scheduledMath";

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
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}

/**
 * Normalize a date string or period to YYYY-MM format.
 * Returns null if input is null/undefined or cannot be normalized.
 */
function toPeriodKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.slice(0, 7);
  // Validate format YYYY-MM
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function MonthlyReport() {
  const transactions = useTransactions();
  const incomeItems = useIncome();
  const scheduledTemplates = useScheduledTemplates();
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentPeriod());
  const [snapTick, setSnapTick] = useState(0);
  const [lockTick, setLockTick] = useState(0);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [regenerateSuccess, setRegenerateSuccess] = useState<string | null>(null);
  const [lockError, setLockError] = useState<string | null>(null);
  const [lockSuccess, setLockSuccess] = useState<string | null>(null);
  const [unlockConfirm, setUnlockConfirm] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Subscribe to locks and snapshots for re-render
  useEffect(() => {
    const unsubscribeLocks = subscribeLocks(() => {
      setLockTick((x) => x + 1);
    });
    const unsubscribeSnapshots = subscribeSnapshots(() => {
      setSnapTick((x) => x + 1);
    });
    return () => {
      unsubscribeLocks();
      unsubscribeSnapshots();
    };
  }, []);

  // Filter transactions for selected month
  const filteredTransactions = useMemo(
    () => filterTransactionsByPeriod(transactions, selectedMonth),
    [transactions, selectedMonth]
  );

  // Calculate income from records for selected month
  const incomeForMonth = useMemo(
    () => filterIncomeByPeriod(incomeItems, selectedMonth),
    [incomeItems, selectedMonth]
  );

  const totalIncome = useMemo(() => sumIncome(incomeForMonth), [incomeForMonth]);

  // Expense transactions only
  const expenseTransactions = useMemo(
    () => filteredTransactions.filter((tx) => tx.direction === "out"),
    [filteredTransactions]
  );

  const totalExpenses = useMemo(
    () => expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0),
    [expenseTransactions]
  );

  const net = useMemo(() => totalIncome - totalExpenses, [totalIncome, totalExpenses]);

  // Normalize selected month to YYYY-MM format for all lock operations
  const selectedPeriodKey = useMemo(() => {
    return toPeriodKey(selectedMonth);
  }, [selectedMonth]);
  const actualOutByCategory = useMemo(
    () => sumByCategory(expenseTransactions),
    [expenseTransactions]
  );

  // Backward compatibility totals object (now based on income records)
  const totals = useMemo(
    () => ({
      totalIn: totalIncome,
      totalOut: totalExpenses,
      net: net,
    }),
    [totalIncome, totalExpenses, net]
  );

  // Get snapshot and plan for view using snapshot-aware helper
  const snapshot = useMemo(
    () => getSnapshot(selectedPeriodKey ?? ""),
    [selectedPeriodKey, snapTick, lockTick]
  );

  const isLocked = useMemo(() => {
    return selectedPeriodKey ? isPeriodLocked(selectedPeriodKey) : false;
  }, [selectedPeriodKey, lockTick]);
  
  const hasSnap = useMemo(() => {
    return selectedPeriodKey ? hasSnapshot(selectedPeriodKey) : false;
  }, [selectedPeriodKey, snapTick]);

  const planForView = useMemo(() => {
    return getPlanForPeriod(selectedPeriodKey);
  }, [selectedPeriodKey, snapTick, lockTick]);

  const currencyForView = planForView?.currency ?? "SGD";

  // Compute scheduled transactions projection
  const scheduledProjection = useMemo(() => {
    if (!selectedPeriodKey) return [];
    return projectScheduledTransactions(scheduledTemplates, transactions as any, selectedPeriodKey);
  }, [scheduledTemplates, transactions, selectedPeriodKey]);

  const scheduledSummary = useMemo(() => {
    return {
      expected: expectedTotal(scheduledProjection),
      matched: matchedTotal(scheduledProjection),
      missing: missingTotal(scheduledProjection),
      missingCount: scheduledProjection.filter((r) => r.status === "missing").length,
    };
  }, [scheduledProjection]);

  const snapshotMissing = isLocked && !hasSnap;

  function handleRegenerateSnapshot() {
    setRegenerateError(null);
    setRegenerateSuccess(null);

    if (!selectedPeriodKey) {
      setRegenerateError("Invalid period selected");
      return;
    }

    const result = regenerateSnapshot(selectedPeriodKey);
    if (result.ok) {
      setRegenerateSuccess("Snapshot regenerated successfully");
      setTimeout(() => setRegenerateSuccess(null), 3000);
    } else {
      setRegenerateError(result.reason);
    }
  }

  function handleLockMonth() {
    setLockError(null);
    setLockSuccess(null);

    if (!selectedPeriodKey) {
      setLockError("Invalid period selected");
      return;
    }

    console.log("[MonthlyReport.handleLockMonth] Locking period:", selectedPeriodKey);
    // lockPeriod automatically creates snapshot if needed, then locks
    const result = lockPeriod(selectedPeriodKey);
    console.log("[MonthlyReport.handleLockMonth] Result:", result);
    if (result.ok) {
      setLockSuccess(`Period ${selectedPeriodKey} is now locked`);
      setTimeout(() => setLockSuccess(null), 3000);
    } else {
      setLockError(result.reason);
    }
  }

  function handleUnlockMonth() {
    setLockError(null);
    setLockSuccess(null);
    setUnlockConfirm(false);

    if (!selectedPeriodKey) {
      setLockError("Invalid period selected");
      return;
    }

    const result = unlockPeriod(selectedPeriodKey);
    if (result.ok) {
      setLockSuccess(`Period ${selectedPeriodKey} is now unlocked`);
      setTimeout(() => setLockSuccess(null), 3000);
    } else {
      setLockError(result.reason);
    }
  }

  async function handleDownloadPDF() {
    setIsGeneratingPDF(true);
    try {
      const element = document.getElementById("monthly-report-content");
      if (!element) {
        console.error("Report container not found");
        return;
      }

      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
      });

      // Create PDF with multiple pages if needed
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      const pdf = new jsPDF("p", "mm", "A4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeightMm = pdf.internal.pageSize.getHeight();

      const imgData = canvas.toDataURL("image/png");

      while (heightLeft > 0) {
        pdf.addImage(imgData, "PNG", 0, -position, pageWidth, imgHeight);

        heightLeft -= pageHeightMm;
        position += pageHeightMm;

        if (heightLeft > 0) {
          pdf.addPage();
        }
      }

      pdf.save(`stewardly-monthly-report-${selectedMonth}.pdf`);
    } catch (error) {
      console.error("PDF generation failed:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function handleExportCSV() {
    // Build CSV with header row
    const csvRows: string[] = ["Date,Category,Direction,Amount,Note"];

    // Add transaction rows
    filteredTransactions.forEach((tx) => {
      const escapedNote = (tx.note || "").replace(/"/g, '""');
      const row = [
        tx.date,
        tx.category,
        tx.direction,
        tx.amount.toString(),
        `"${escapedNote}"`,
      ];
      csvRows.push(row.join(","));
    });

    const csvContent = csvRows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", `stewardly-monthly-report-${selectedMonth}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div id="monthly-report-pdf" className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-3xl font-bold">Monthly Report</h1>
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-slate-700">Select Month</label>
          <input
            type="month"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
          {isLocked && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              Locked
            </span>
          )}
          {!isLocked && (
            <button
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
              onClick={handleLockMonth}
              disabled={snapshotMissing}
              title="Create snapshot and lock this period"
            >
              Lock Month
            </button>
          )}
          {isLocked && (
            <div className="flex items-center gap-2">
              {unlockConfirm ? (
                <>
                  <span className="text-sm text-slate-600">Confirm unlock?</span>
                  <button
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-100"
                    onClick={handleUnlockMonth}
                    disabled={snapshotMissing}
                  >
                    Confirm
                  </button>
                  <button
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setUnlockConfirm(false)}
                    disabled={snapshotMissing}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setUnlockConfirm(true)}
                  disabled={snapshotMissing}
                  title="Unlock this period"
                >
                  Unlock Month
                </button>
              )}
            </div>
          )}
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={handlePrint}
          >
            Print
          </button>
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF || snapshotMissing}
          >
            {isGeneratingPDF ? "Generating..." : "Download PDF"}
          </button>
          <button
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportCSV}
            disabled={snapshotMissing}
          >
            Export CSV
          </button>
        </div>
      </div>

      <div id="monthly-report-content" className="space-y-6">
      {snapshotMissing && (
        <div className="space-y-3 rounded-lg border border-red-300 bg-red-50 p-4 print-avoid-break">
          <div className="text-sm text-red-900">
            This period is locked, but the plan snapshot is missing. Regenerate to view allocations.
          </div>
          <button
            className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-sm font-medium text-red-900 hover:bg-red-200"
            onClick={handleRegenerateSnapshot}
          >
            Regenerate snapshot
          </button>
          {regenerateError && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">
              {regenerateError}
            </div>
          )}
          {regenerateSuccess && (
            <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">
              {regenerateSuccess}
            </div>
          )}
        </div>
      )}

      {isLocked && !snapshotMissing && snapshot && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900 print-avoid-break">
          <div className="font-semibold">📸 Snapshot used</div>
          <div className="mt-1 text-xs text-emerald-800">
            Locked at {new Date(snapshot.lockedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      )}      {lockError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900">
          <div className="font-semibold">Lock Failed</div>
          <div className="mt-1">{lockError}</div>
        </div>
      )}

      {lockSuccess && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900">
          <div className="font-semibold">Success</div>
          <div className="mt-1">{lockSuccess}</div>
        </div>
      )}

      {/* Status Section */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 print-avoid-break">
        <h2 className="text-lg font-semibold">Status</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-sm text-slate-600">Period</span>
            <span className="text-sm font-semibold text-slate-900">{selectedPeriodKey || "—"}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-sm text-slate-600">Lock Status</span>
            <span className={`text-sm font-semibold ${isLocked ? "text-amber-700" : "text-emerald-700"}`}>
              {isLocked ? "🔒 Locked" : "🔓 Unlocked"}
            </span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-sm text-slate-600">Snapshot</span>
            <span className={`text-sm font-semibold ${
              !isLocked 
                ? "text-slate-600" 
                : snapshot 
                  ? "text-emerald-700" 
                  : "text-red-700"
            }`}>
              {!isLocked ? "Not required" : snapshot ? "Present" : "Missing"}
            </span>
          </div>
          {isLocked && snapshot && (
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-sm text-slate-600">Locked At</span>
              <span className="text-sm font-semibold text-slate-900">
                {new Date(snapshot.lockedAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
        </div>

        {/* Totals Section */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 print-avoid-break">
        <h2 className="text-lg font-semibold">Totals</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Total Income</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-700">
              {formatMoney(totals.totalIn, currencyForView)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Total Expenses</div>
            <div className="mt-2 text-2xl font-semibold text-red-700">
              {formatMoney(totals.totalOut, currencyForView)}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="text-sm text-slate-600">Net</div>
            <div
              className={`mt-2 text-2xl font-semibold ${
                totals.net >= 0 ? "text-emerald-700" : "text-red-700"
              }`}
            >
              {formatMoney(totals.net, currencyForView)}
            </div>
          </div>
        </div>
        </div>

        {/* Scheduled Expenses Summary */}
        {scheduledSummary.expected > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 print-avoid-break">
            <h2 className="text-lg font-semibold">Scheduled Expenses</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm text-slate-600">Expected</div>
                <div className="mt-2 text-xl font-semibold text-slate-900">
                  {formatMoney(scheduledSummary.expected, currencyForView)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-emerald-50 p-4">
                <div className="text-sm text-emerald-700">Matched</div>
                <div className="mt-2 text-xl font-semibold text-emerald-700">
                  {formatMoney(scheduledSummary.matched, currencyForView)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-amber-50 p-4">
                <div className="text-sm text-amber-700">Missing</div>
                <div className="mt-2 text-xl font-semibold text-amber-700">
                  {formatMoney(scheduledSummary.missing, currencyForView)}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-blue-50 p-4">
                <div className="text-sm text-blue-700">Missing Count</div>
                <div className="mt-2 text-xl font-semibold text-blue-700">
                  {scheduledSummary.missingCount}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Breakdown Section */}
        {planForView && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 print-avoid-break">
          <h2 className="text-lg font-semibold">Category Breakdown</h2>
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <div className="col-span-3">Category</div>
              <div className="col-span-3 text-right">Planned</div>
              <div className="col-span-3 text-right">Actual</div>
              <div className="col-span-3 text-right">Variance</div>
            </div>

            <div className="divide-y divide-slate-200">
              {planForView.targets.map((target) => {
                const plannedAmount = (totalIncome * target.targetPct) / 100;
                const actualAmount = actualOutByCategory.get(target.category) ?? 0;
                const varianceAmount = actualAmount - plannedAmount;
                const isOver = varianceAmount > 0;

                return (
                  <div
                    key={target.category}
                    className={`grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm ${
                      isOver ? "bg-red-50" : ""
                    }`}
                  >
                    <div className="col-span-3 font-medium text-slate-900">
                      {target.category}
                    </div>
                    <div className="col-span-3 text-right text-slate-700">
                      {formatMoney(plannedAmount, currencyForView)}
                    </div>
                    <div className="col-span-3 text-right font-medium text-slate-900">
                      {formatMoney(actualAmount, currencyForView)}
                    </div>
                    <div
                      className={`col-span-3 text-right font-medium ${
                        isOver ? "text-red-700" : "text-emerald-700"
                      }`}
                    >
                      {formatMoney(varianceAmount, currencyForView)}
                    </div>
                  </div>
                );
              })}
              <div className="grid grid-cols-12 gap-2 items-center border-t border-slate-200 px-4 py-3 text-sm font-semibold">
                <div className="col-span-3 text-slate-900">Total</div>
                <div className="col-span-3 text-right text-slate-900">
                  {formatMoney(totals.totalIn, currencyForView)}
                </div>
                <div className="col-span-3 text-right text-slate-900">
                  {formatMoney(totals.totalOut, currencyForView)}
                </div>
                <div
                  className={`col-span-3 text-right ${
                    totals.totalOut - totals.totalIn > 0
                      ? "text-red-700"
                      : totals.totalOut - totals.totalIn < 0
                        ? "text-emerald-700"
                        : "text-slate-600"
                  }`}
                >
                  {formatMoney(totals.totalOut - totals.totalIn, currencyForView)}
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Transactions Section */}
        <div className="rounded-lg border border-slate-200 bg-white p-6 print-avoid-break">
        <h2 className="text-lg font-semibold">Transactions</h2>
        {isLocked && (
          <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            Read-only month
          </div>
        )}

        {filteredTransactions.length === 0 ? (
          <div className="mt-6 text-center text-sm text-slate-500">
            No transactions for this month
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="divide-y divide-slate-200">
              {filteredTransactions.map((tx, idx) => (
                <div key={tx.id ?? `${tx.date}-${tx.category}-${tx.amount}-${idx}`} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm">
                  <div className="col-span-2 text-slate-600">{formatDate(tx.date)}</div>
                  <div className="col-span-2 font-medium text-slate-900">{tx.category}</div>
                  <div className="col-span-4 text-slate-600">{tx.note || "-"}</div>
                  <div className="col-span-2 text-right">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                        tx.direction === "in"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {tx.direction === "in" ? "Income" : "Expense"}
                    </span>
                  </div>
                  <div
                    className={`col-span-2 text-right font-semibold ${
                      tx.direction === "in" ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {formatMoney(tx.amount, currencyForView)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
