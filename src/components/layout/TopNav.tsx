import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession } from "../../state/sessionStore";
import {
  getHouseholdState,
  setSelectedHouseholdId,
  type Household,
} from "../../state/householdStore";

export function TopNav() {
  const navigate = useNavigate();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const s = getHouseholdState();
    setHouseholds(s.households);
    setSelectedId(s.selectedHouseholdId);
  }, []);

  function onChangeHousehold(id: string) {
    setSelectedId(id);
    setSelectedHouseholdId(id);
    // Later: we will invalidate React Query caches on household change.
  }

  function onLogout() {
    clearSession();
    navigate("/login");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-slate-900 px-3 py-1 text-sm font-semibold text-white">
            Stewardly
          </div>
          <div className="hidden text-sm text-slate-600 md:block">
            Distribution-first personal finance
          </div>
        </div>

        <div className="flex items-center gap-3">
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={selectedId ?? ""}
            onChange={(e) => onChangeHousehold(e.target.value)}
            disabled={households.length === 0}
            aria-label="Select household"
          >
            {households.length === 0 ? (
              <option value="">No household</option>
            ) : null}

            {households.map((h) => (
              <option key={h.household_id} value={h.household_id}>
                {h.name} ({h.base_currency})
              </option>
            ))}
          </select>

          <button
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
