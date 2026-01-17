import { useMemo, useRef } from "react";
import type { CategoryName } from "../../constants/categories";

export type DistributionTarget = {
  category: CategoryName;
  targetPct: number;
};

export type DistributionTargetsEditorError = {
  type: "duplicate" | "invalid_pct" | "total";
  message: string;
};

interface DistributionTargetsEditorProps {
  allCategories: readonly CategoryName[];
  value: DistributionTarget[];
  onChange: (nextVisibleTargets: DistributionTarget[]) => void;
}

interface ComputedState {
  totalPct: number;
  errors: DistributionTargetsEditorError[];
  isValid: boolean;
}

/**
 * DistributionTargetsEditor
 * Manages visible allocation targets with smart category selection
 * - Shows only rows with targetPct > 0 (visible targets)
 * - Category dropdown excludes already-selected categories
 * - Validates: no duplicates, each 0-100%, total = 100%
 */
export function DistributionTargetsEditor({
  allCategories,
  value,
  onChange,
}: DistributionTargetsEditorProps) {
  const focusInputRef = useRef<HTMLInputElement>(null);

  // Compute validation and total
  const computedState = useMemo((): ComputedState => {
    const errors: DistributionTargetsEditorError[] = [];

    // Check for duplicate categories
    const categories = value.map((t) => t.category);
    const uniqueCategories = new Set(categories);
    if (uniqueCategories.size !== categories.length) {
      errors.push({
        type: "duplicate",
        message: "Duplicate categories detected",
      });
    }

    // Check each target has valid percentage
    for (const target of value) {
      const pct = target.targetPct;
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        errors.push({
          type: "invalid_pct",
          message: `${target.category}: percentage must be between 0 and 100`,
        });
      }
    }

    // Calculate total
    const totalPct = Math.round(
      (value.reduce((sum, t) => sum + (t.targetPct || 0), 0) + Number.EPSILON) *
        100
    ) / 100;

    // Check total equals 100
    if (totalPct !== 100) {
      errors.push({
        type: "total",
        message: `Total allocation must be 100% (currently ${totalPct}%)`,
      });
    }

    return {
      totalPct,
      errors,
      isValid: errors.length === 0,
    };
  }, [value]);

  // Get available categories (not in current value)
  const usedCategories = new Set(value.map((t) => t.category));
  const availableCategories = allCategories.filter(
    (cat) => !usedCategories.has(cat)
  );

  // Handlers
  const handleAddCategory = () => {
    if (availableCategories.length === 0) return;

    const firstAvailable = availableCategories[0];
    const newTarget: DistributionTarget = {
      category: firstAvailable,
      targetPct: 0,
    };

    onChange([...value, newTarget]);

    // Focus the new input after render
    setTimeout(() => {
      focusInputRef.current?.focus();
    }, 0);
  };

  const handleRemoveTarget = (indexToRemove: number) => {
    onChange(value.filter((_, i) => i !== indexToRemove));
  };

  const handleUpdateCategory = (
    indexToUpdate: number,
    newCategory: CategoryName
  ) => {
    const updated = [...value];
    updated[indexToUpdate] = {
      ...updated[indexToUpdate],
      category: newCategory,
    };
    onChange(updated);
  };

  const handleUpdatePct = (indexToUpdate: number, newPct: string) => {
    const numPct = parseFloat(newPct);
    const clamped = Number.isFinite(numPct)
      ? Math.max(0, Math.min(100, numPct))
      : 0;

    const updated = [...value];
    updated[indexToUpdate] = {
      ...updated[indexToUpdate],
      targetPct: clamped,
    };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {/* Validation Errors */}
      {computedState.errors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-300 p-4">
          {computedState.errors.map((error, i) => (
            <p key={i} className="text-sm text-red-800">
              • {error.message}
            </p>
          ))}
        </div>
      )}

      {/* Total Status */}
      <div className="flex items-center justify-between px-4 py-3 rounded-lg bg-slate-50 border border-slate-200">
        <span className="font-semibold text-slate-900">Total Allocation</span>
        <span
          className={`font-semibold text-lg ${
            computedState.totalPct === 100
              ? "text-emerald-700"
              : computedState.totalPct < 100
              ? "text-amber-700"
              : "text-red-700"
          }`}
        >
          {computedState.totalPct}%
        </span>
      </div>

      {/* Targets Table */}
      <div className="space-y-3">
        {value.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-slate-200">
            {/* Header */}
            <div className="grid grid-cols-12 gap-2 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
              <div className="col-span-5">Category</div>
              <div className="col-span-5 text-right">Target %</div>
              <div className="col-span-2"></div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-slate-200">
              {value.map((target, index) => (
                <div
                  key={`${target.category}-${index}`}
                  className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  {/* Category Dropdown */}
                  <div className="col-span-5">
                    <select
                      value={target.category}
                      onChange={(e) =>
                        handleUpdateCategory(
                          index,
                          e.target.value as CategoryName
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors"
                    >
                      {/* Current category always available */}
                      <option value={target.category}>{target.category}</option>

                      {/* Other available categories */}
                      {availableCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Percentage Input */}
                  <div className="col-span-5">
                    <div className="flex items-center gap-2">
                      <input
                        ref={index === value.length - 1 ? focusInputRef : null}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={target.targetPct}
                        onChange={(e) =>
                          handleUpdatePct(index, e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-right text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors"
                        placeholder="0"
                      />
                      <span className="text-sm font-medium text-slate-600 w-6 text-right">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => handleRemoveTarget(index)}
                      className="p-1 rounded hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors"
                      title="Remove this target"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
            <p className="text-slate-600 font-medium">No targets added yet</p>
            <p className="text-slate-500 text-sm mt-1">
              Add your first target below to get started
            </p>
          </div>
        )}

        {/* Add Category Button */}
        <button
          onClick={handleAddCategory}
          disabled={availableCategories.length === 0}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            availableCategories.length > 0
              ? "border border-slate-300 text-slate-700 hover:bg-slate-50"
              : "border border-slate-200 text-slate-400 cursor-not-allowed bg-slate-50"
          }`}
          title={
            availableCategories.length > 0
              ? "Add a new target"
              : "All categories added"
          }
        >
          + Add Category
        </button>
      </div>
    </div>
  );
}

/**
 * Export hook for consuming computed state separately if needed
 */
export function useDistributionTargetsValidation(
  targets: DistributionTarget[]
) {
  return useMemo(() => {
    const errors: DistributionTargetsEditorError[] = [];

    // Check for duplicates
    const categories = targets.map((t) => t.category);
    const uniqueCategories = new Set(categories);
    if (uniqueCategories.size !== categories.length) {
      errors.push({
        type: "duplicate",
        message: "Duplicate categories detected",
      });
    }

    // Check percentages
    for (const target of targets) {
      const pct = target.targetPct;
      if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
        errors.push({
          type: "invalid_pct",
          message: `${target.category}: percentage must be between 0 and 100`,
        });
      }
    }

    // Calculate and check total
    const totalPct = Math.round(
      (targets.reduce((sum, t) => sum + (t.targetPct || 0), 0) +
        Number.EPSILON) *
        100
    ) / 100;

    if (totalPct !== 100) {
      errors.push({
        type: "total",
        message: `Total allocation must be 100% (currently ${totalPct}%)`,
      });
    }

    return {
      totalPct,
      errors,
      isValid: errors.length === 0,
    };
  }, [targets]);
}
