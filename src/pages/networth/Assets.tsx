import { useMemo, useState } from "react";

// Lightweight localStorage for assets
const ASSETS_KEY = "stewardly_assets";

type Asset = {
  id: string;
  name: string;
  value: number;
};

function getAssets(): Asset[] {
  try {
    const raw = localStorage.getItem(ASSETS_KEY);
    return JSON.parse(raw || "[]");
  } catch {
    return [];
  }
}

function saveAssets(assets: Asset[]) {
  localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
}

function formatMoney(amount: number, currency = "SGD") {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function Assets() {
  const [assets, setAssets] = useState<Asset[]>(getAssets());
  const [name, setName] = useState<string>("");
  const [value, setValue] = useState<number>(0);

  const totalAssets = useMemo(() => assets.reduce((sum, a) => sum + a.value, 0), [assets]);

  function handleAdd() {
    if (!name.trim() || !Number.isFinite(value) || value < 0) return;

    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: name.trim(),
      value,
    };

    const updated = [...assets, newAsset];
    setAssets(updated);
    saveAssets(updated);
    setName("");
    setValue(0);
  }

  function handleDelete(id: string) {
    const updated = assets.filter((a) => a.id !== id);
    setAssets(updated);
    saveAssets(updated);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Assets</h1>

      {/* Add Asset Form */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Add Asset</h2>

        <div className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-6">
            <label className="text-sm font-medium text-slate-700">Asset Name</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Savings Account, Car, House"
            />
          </div>

          <div className="md:col-span-4">
            <label className="text-sm font-medium text-slate-700">Value (SGD)</label>
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

      {/* Assets List */}
      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Assets</h2>
            <p className="mt-1 text-sm text-slate-600">{assets.length} items</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-600">Total Assets</div>
            <div className="text-2xl font-bold text-emerald-700">{formatMoney(totalAssets)}</div>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
          <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <div className="col-span-6">Name</div>
            <div className="col-span-4 text-right">Value</div>
            <div className="col-span-2 text-right">Action</div>
          </div>

          <div className="divide-y divide-slate-200">
            {assets.map((asset) => (
              <div key={asset.id} className="grid grid-cols-12 gap-2 items-center px-4 py-3 text-sm">
                <div className="col-span-6 font-medium">{asset.name}</div>
                <div className="col-span-4 text-right text-slate-700">{formatMoney(asset.value)}</div>
                <div className="col-span-2 text-right">
                  <button
                    className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50"
                    onClick={() => handleDelete(asset.id)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {assets.length === 0 && (
              <div className="px-4 py-6 text-sm text-slate-600">No assets yet.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

