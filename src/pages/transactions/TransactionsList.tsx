import { useTransactions } from "../../state/useTransactions";
import type { MoneyTransaction } from "../../types/transactions";

function formatMoney(amount: number, currency = "SGD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function TransactionsList() {
  const transactions = useTransactions();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Transactions</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Recent transactions</h2>
        <p className="mt-1 text-sm text-slate-600">{transactions.length} items</p>

        <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Category</div>
            <div className="col-span-3">Note</div>
            <div className="col-span-4 text-right">Amount</div>
          </div>

          <div className="divide-y divide-slate-200">
            {transactions.map((t: MoneyTransaction) => {
              const isIncome = t.direction === "in";
              const sign = isIncome ? "+" : "−";
              const amountColor = isIncome ? "text-emerald-700" : "text-red-700";
              const badgeBg = isIncome ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800";
              const badgeLabel = isIncome ? "Income" : "Expense";

              return (
                <div key={t.id} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
                  <div className="col-span-2 text-slate-600">{t.date}</div>
                  <div className="col-span-3 font-medium">{t.category}</div>
                  <div className="col-span-3 text-slate-600">{t.note ?? "—"}</div>
                  <div className="col-span-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`font-semibold ${amountColor}`}>
                        {sign} {formatMoney(t.amount)}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${badgeBg}`}>
                        {badgeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}

            {transactions.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-600">No transactions yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
