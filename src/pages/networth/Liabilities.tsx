import { useMemo, useState } from "react";

// Lightweight localStorage for liabilities
const LIABILITIES_KEY = "stewardly_liabilities";

type Liability = {
  id: string;
  name: string;
  value: number;
};

function getLiabilities(): Liability[] {
  try {
    const raw = localStorage.getItem(LIABILITIES_KEY);
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function saveLiabilities(liabilities: Liability[]) {
  localStorage.setItem(LIABILITIES_KEY, JSON.stringify(liabilities));
}

function formatMoney(amount: number, currency = "SGD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function Liabilities() {
  const [liabilities, setLiabilities] = useState<Liability[]>(getLiabilities());
  const [name, setName] = useState<string>("");
  const [value, setValue] = useState<number>(0);

  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum, l) => sum + l.value, 0),
    [liabilities]
  );

  function handleAdd() {
    if (!name.trim() || !Number.isFinite(value) || value < 0) return;

    const newLiability: Liability = {
      id: crypto.randomUUID(),
      name: name.trim(),
      value,
    };

    const updated = [...liabilities, newLiability];
    setLiabilities(updated);
    saveLiabilities(updated);
    setName("");
    setValue(0);
  }

  function handleDelete(id: string) {
    const updated = liabilities.filter((l) => l.id !== id);
    setLiabilities(updated);
    saveLiabilities(updated);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Liabilities</h1>

      {/* Add Liability Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Add Liability</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="text-sm font-medium text-slate-700">Liability Name</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mortgage, Car Loan, Credit Card"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-medium text-slate-700">Amount Owed (SGD)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
            />
          </div>

          <div className="md:col-span-2 flex items-end">
            <button
              className={`w-full rounded-lg px-4 py-2 text-sm font-medium ${
                name.trim() && value >= 0
                  ? "bg-slate-900 text-white"
                  : "bg-slate-200 text-slate-500"
              }`}
              onClick={handleAdd}
              disabled={!name.trim() || value < 0}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Liabilities List */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Liabilities</h2>
            <p className="mt-1 text-sm text-slate-600">{liabilities.length} items</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-600">Total Liabilities</div>
            <div className="text-2xl font-bold text-red-700">{formatMoney(totalLiabilities)}</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-6">Name</div>
            <div className="col-span-4 text-right">Amount</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="divide-y divide-slate-200">
            {liabilities.map((liability) => (
              <div key={liability.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm">
                <div className="col-span-6 font-medium">{liability.name}</div>
                <div className="col-span-4 text-right text-slate-700">{formatMoney(liability.value)}</div>
                <div className="col-span-2 text-right">
                  <button
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => handleDelete(liability.id)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {liabilities.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-600">No liabilities yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

