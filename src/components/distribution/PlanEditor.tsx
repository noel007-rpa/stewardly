import { useMemo, useState } from "react";
import type { DistributionPlan } from "../../types/distribution";
import { setDistributionPlan } from "../../state/distributionPlanStore";

type Props = {
  plan: DistributionPlan;
  readOnly?: boolean;
};

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function PlanEditor({ plan, readOnly = false }: Props) {
  const [draft, setDraft] = useState<DistributionPlan>(() => structuredClone(plan));
  const [isOpen, setIsOpen] = useState(true);

  // If the incoming plan changes (e.g., clear/reset), you may refresh manually by reloading page for now.
  // We keep it simple to avoid complexity in MVP.

  const total = useMemo(
    () => round2(draft.targets.reduce((acc, t) => acc + t.targetPct, 0)),
    [draft]
  );

  const canSave = total === 100;

  function updatePct(index: number, value: number) {
    setDraft((prev) => {
      const next = structuredClone(prev);
      next.targets[index].targetPct = Number.isFinite(value) ? value : 0;
      return next;
    });
  }

  function onSave() {
    if (readOnly) return; // Guard: prevent save when read-only
    setDistributionPlan(draft);
  }

  function onReset() {
    if (readOnly) return; // Guard: prevent reset when read-only
    setDraft(structuredClone(plan));
  }

  function handleToggle(e: React.KeyboardEvent | React.MouseEvent) {
    if (e instanceof KeyboardEvent) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    } else {
      setIsOpen(!isOpen);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6">
      {/* Header - Clickable/Keyboard accessible */}
      <button
        type="button"
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-slate-400 rounded"
        onClick={handleToggle}
        onKeyDown={handleToggle}
        aria-expanded={isOpen}
        aria-controls="plan-editor-content"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Edit Distribution Plan</h2>
              {/* Chevron icon */}
              <svg
                className={`h-5 w-5 text-slate-600 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            {!isOpen && (
              <p className="mt-1 text-xs text-slate-500">Collapsed — click to expand</p>
            )}
            {isOpen && (
              <p className="mt-1 text-sm text-slate-600">
                Update your target percentages. Total should equal 100%.
              </p>
            )}
          </div>

          <div className="text-right shrink-0">
            <div className="text-sm text-slate-600">Total</div>
            <div className={`text-xl font-semibold ${total === 100 ? "text-slate-900" : "text-amber-700"}`}>
              {total}%
            </div>
          </div>
        </div>
      </button>

      {/* Expandable content - Show only when open */}
      {isOpen && (
        <div
          id="plan-editor-content"
          className="transition-all duration-200 ease-in-out overflow-hidden"
        >
          {readOnly && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="font-semibold">Locked period — plan editing disabled</div>
            </div>
          )}

          {total !== 100 && !readOnly && (
            <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Your distribution totals {total}%. Adjust the values to reach 100% to enable saving.
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-12 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <div className="col-span-8">Category</div>
              <div className="col-span-4 text-right">Target %</div>
            </div>

            <div className="divide-y divide-slate-200">
              {draft.targets.map((t, idx) => (
                <div key={t.category} className="grid grid-cols-12 items-center px-4 py-2">
                  <div className="col-span-8 text-sm">{t.category}</div>
                  <div className="col-span-4 flex justify-end">
                    <input
                      type="number"
                      className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-sm disabled:bg-slate-50 disabled:text-slate-500"
                      value={t.targetPct}
                      onChange={(e) => updatePct(idx, Number(e.target.value))}
                      min={0}
                      step="1"
                      disabled={readOnly}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 flex gap-3">
            {!readOnly && (
              <>
                <button
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    canSave ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-500"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  onClick={onSave}
                  disabled={!canSave}
                >
                  Save
                </button>

                <button
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium"
                  onClick={onReset}
                >
                  Reset
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
