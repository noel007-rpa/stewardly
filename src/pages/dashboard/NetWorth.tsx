import { useMemo, useState, useEffect } from "react";

function formatMoney(amount: number, currency = "SGD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function getAssets() {
  try {
    const raw = localStorage.getItem("stewardly_assets");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function getLiabilities() {
  try {
    const raw = localStorage.getItem("stewardly_liabilities");
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

export function NetWorthDashboard() {
  const [assets, setAssets] = useState(getAssets());
  const [liabilities, setLiabilities] = useState(getLiabilities());

  // Poll for changes from other tabs (simple approach)
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(getAssets());
      setLiabilities(getLiabilities());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const totalAssets = useMemo(() => assets.reduce((sum: number, a: any) => sum + a.value, 0), [assets]);
  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum: number, l: any) => sum + l.value, 0),
    [liabilities]
  );
  const netWorth = totalAssets - totalLiabilities;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Net Worth</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm text-slate-600">Total Assets</div>
          <div className="mt-2 text-3xl font-bold text-emerald-700">{formatMoney(totalAssets)}</div>
          <p className="mt-2 text-xs text-slate-500">{assets.length} items</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm text-slate-600">Total Liabilities</div>
          <div className="mt-2 text-3xl font-bold text-red-700">{formatMoney(totalLiabilities)}</div>
          <p className="mt-2 text-xs text-slate-500">{liabilities.length} items</p>
        </div>

        <div className={`rounded-lg border-2 bg-white p-6 ${
          netWorth >= 0 ? "border-emerald-300" : "border-red-300"
        }`}>
          <div className="text-sm text-slate-600">Net Worth</div>
          <div className={`mt-2 text-3xl font-bold ${
            netWorth >= 0 ? "text-emerald-700" : "text-red-700"
          }`}>
            {formatMoney(netWorth)}
          </div>
          <p className="mt-2 text-xs text-slate-500">Assets - Liabilities</p>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Breakdown</h2>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-6">Category</div>
            <div className="col-span-6 text-right">Value</div>
          </div>

          <div className="divide-y divide-slate-200">
            {/* Assets section */}
            <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm bg-emerald-50">
              <div className="col-span-6 font-semibold text-emerald-900">Assets</div>
              <div className="col-span-6 text-right font-semibold text-emerald-700">{formatMoney(totalAssets)}</div>
            </div>

            {assets.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-600">No assets recorded.</div>
            ) : (
              assets.map((asset: any) => (
                <div key={asset.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2 text-sm">
                  <div className="col-span-6 text-slate-700">— {asset.name}</div>
                  <div className="col-span-6 text-right text-slate-700">{formatMoney(asset.value)}</div>
                </div>
              ))
            )}

            {/* Liabilities section */}
            <div className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm bg-red-50">
              <div className="col-span-6 font-semibold text-red-900">Liabilities</div>
              <div className="col-span-6 text-right font-semibold text-red-700">{formatMoney(totalLiabilities)}</div>
            </div>

            {liabilities.length === 0 ? (
              <div className="px-4 py-2 text-sm text-slate-600">No liabilities recorded.</div>
            ) : (
              liabilities.map((liability: any) => (
                <div key={liability.id} className="grid grid-cols-12 gap-2 items-center px-4 py-2 text-sm">
                  <div className="col-span-6 text-slate-700">— {liability.name}</div>
                  <div className="col-span-6 text-right text-slate-700">{formatMoney(liability.value)}</div>
                </div>
              ))
            )}

            {/* Net Worth row */}
            <div className={`grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm font-semibold border-t-2 ${
              netWorth >= 0 ? "bg-emerald-50" : "bg-red-50"
            }`}>
              <div className={netWorth >= 0 ? "col-span-6 text-emerald-900" : "col-span-6 text-red-900"}>
                Net Worth
              </div>
              <div className={`col-span-6 text-right ${
                netWorth >= 0 ? "text-emerald-700" : "text-red-700"
              }`}>
                {formatMoney(netWorth)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

