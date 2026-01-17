import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { DistributionPlan } from "../../types/distribution";
import { getPlan, createPlan, updatePlan, setActivePlan, duplicatePlan, deletePlan } from "../../state/distributionPlansStore";
import { CATEGORIES } from "../../constants/categories";
import { ConfirmLeaveModal } from "../../components/common/ConfirmLeaveModal";
import { DistributionTargetsEditor, type DistributionTarget, useDistributionTargetsValidation } from "../../components/distribution/DistributionTargetsEditor";

type FormData = {
  name: string;
  currency: string;
  targets: DistributionTarget[];
};

function createDefaultFormData(plan?: DistributionPlan): FormData {
  if (!plan) {
    return {
      name: "",
      currency: "SGD",
      targets: [],
    };
  }

  // Filter targets to only those with targetPct > 0 (visible targets)
  const visibleTargets = plan.targets.filter((t) => t.targetPct > 0);

  return {
    name: plan.name,
    currency: plan.currency,
    targets: visibleTargets,
  };
}

function isFormDirty(original: FormData, current: FormData): boolean {
  // Compare primitives
  if (original.name !== current.name || original.currency !== current.currency) {
    return true;
  }

  // Compare targets array (sort by category for stable comparison)
  const originalTargets = [...original.targets].sort((a, b) => a.category.localeCompare(b.category));
  const currentTargets = [...current.targets].sort((a, b) => a.category.localeCompare(b.category));
  if (JSON.stringify(originalTargets) !== JSON.stringify(currentTargets)) {
    return true;
  }

  return false;
}

type ValidationError = {
  field: string;
  message: string;
};

export function PlanEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();

  // Load existing plan or initialize blank
  const existingPlan = useMemo(() => (id ? getPlan(id) ?? undefined : undefined), [id]);
  const isNew = !id; // New plan if no route id
  const isNotFound = id && !existingPlan; // Route has id but plan doesn't exist

  const initialFormData = useMemo(() => createDefaultFormData(existingPlan), [existingPlan]);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Reset formData when existingPlan changes (route id changes)
  useEffect(() => {
    setFormData(initialFormData);
  }, [initialFormData]);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);

  // Use DistributionTargetsEditor validation hook
  const targetsValidation = useDistributionTargetsValidation(formData.targets);
  
  // Compute overall validation state
  const validationErrors: ValidationError[] = useMemo(() => {
    const errors: ValidationError[] = [];

    // Check name required
    if (formData.name.trim() === "") {
      errors.push({ field: "name", message: "Plan name is required" });
    }

    // Add targets validation errors (convert to ValidationError format)
    targetsValidation.errors.forEach((err) => {
      errors.push({
        field: err.type,
        message: err.message,
      });
    });

    return errors;
  }, [formData.name, targetsValidation.errors]);

  const isValid = formData.name.trim() !== "" && targetsValidation.isValid;
  const totalPct = targetsValidation.totalPct;

  const isDirty = isFormDirty(initialFormData, formData);

  // Handle navigation with unsaved changes check
  const handleNavigate = useCallback(
    (targetPath: string) => {
      if (isDirty) {
        setPendingNavigation(targetPath);
        setShowConfirmLeave(true);
      } else {
        navigate(targetPath);
      }
    },
    [isDirty, navigate]
  );

  const handleDiscardChanges = useCallback(() => {
    setShowConfirmLeave(false);
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation, navigate]);

  const handleStayAndEdit = useCallback(() => {
    setShowConfirmLeave(false);
    setPendingNavigation(null);
  }, []);

  // Browser beforeunload protection
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handleSave = useCallback(async () => {
    if (!isValid) return;

    setIsSaving(true);
    try {
      // Build complete targets array (all canonical categories)
      // Visible targets from formData, hidden categories get 0%
      const visibleTargetsMap = new Map(formData.targets.map((t) => [t.category, t.targetPct]));
      const fullTargets = CATEGORIES.map((cat) => ({
        category: cat,
        targetPct: visibleTargetsMap.get(cat) ?? 0,
      }));

      const newPlan: DistributionPlan = {
        id: existingPlan?.id || crypto.randomUUID(),
        name: formData.name.trim(),
        currency: formData.currency,
        targets: fullTargets,
        updatedAt: new Date().toISOString(),
        isActive: existingPlan?.isActive ?? false,
        hasSnapshots: existingPlan?.hasSnapshots ?? false,
      };

      if (existingPlan) {
        updatePlan(newPlan);
      } else {
        createPlan(newPlan);
      }

      navigate("/plans");
    } finally {
      setIsSaving(false);
    }
  }, [existingPlan, formData, isValid, navigate]);

  const handleUpdateTargets = useCallback((newTargets: DistributionTarget[]) => {
    setFormData((prev) => ({ ...prev, targets: newTargets }));
  }, []);

  const handleDuplicate = useCallback(() => {
    if (!existingPlan) return;
    setShowOverflowMenu(false);
    const duplicated = duplicatePlan(existingPlan.id);
    if (duplicated) {
      navigate(`/plans/${duplicated.id}/edit`);
    }
  }, [existingPlan, navigate]);

  const handleDelete = useCallback(() => {
    if (!existingPlan) return;
    if (existingPlan.hasSnapshots) {
      alert("Cannot delete plan with locked period snapshots.");
      return;
    }
    deletePlan(existingPlan.id);
    navigate("/plans");
  }, [existingPlan, navigate]);

  // Get error messages by field
  const getFieldErrors = (field: string): string[] => validationErrors.filter((e) => e.field === field).map((e) => e.message);
  const nameErrors = getFieldErrors("name");

  // Render plan-not-found state
  if (isNotFound) {
    return (
      <div className="flex flex-col h-screen bg-slate-50">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4">
            <button
              onClick={() => navigate("/plans")}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
              title="Back to Plans"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Back</span>
            </button>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <svg className="h-12 w-12 text-slate-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Plan Not Found</h1>
            <p className="text-slate-600 mb-6">The distribution plan you're looking for doesn't exist or has been deleted.</p>
            <button
              onClick={() => navigate("/plans")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold transition-colors"
            >
              Return to Plans
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left: Back button + Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigate("/plans")}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
                title="Back to Plans"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="text-sm font-medium">Back</span>
              </button>

              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {isNew ? "New Distribution Plan" : "Edit Distribution Plan"}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  {isNew ? "Create a new allocation strategy" : "Update your allocation strategy"}
                </p>
              </div>
            </div>

            {/* Right: Total % pill + Actions */}
            <div className="flex items-center gap-4">
              {/* Total Percentage Pill */}
              <div
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-sm ${
                  totalPct === 100
                    ? "bg-emerald-100 text-emerald-800"
                    : totalPct < 100
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                <span>{totalPct}%</span>
                {totalPct === 100 && (
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleNavigate("/plans")}
                  className="px-4 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Cancel and return to plans"
                >
                  Cancel
                </button>

                <button
                  onClick={handleSave}
                  disabled={!isValid || isSaving}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    isValid && !isSaving
                      ? "bg-slate-900 hover:bg-slate-800 text-white"
                      : "bg-slate-300 text-slate-500 cursor-not-allowed"
                  }`}
                  title={isValid ? "Save this plan" : "Complete all fields to save"}
                >
                  {isSaving ? "Saving..." : "Save Plan"}
                </button>

                {/* Overflow Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title="More options"
                  >
                    <svg className="h-5 w-5 text-slate-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.5 1.5H9.5V3.5H10.5V1.5ZM10.5 8.5H9.5V10.5H10.5V8.5ZM10.5 15.5H9.5V17.5H10.5V15.5Z" />
                    </svg>
                  </button>

                  {showOverflowMenu && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-200 bg-white shadow-lg z-50">
                      {!isNew && existingPlan && !existingPlan.isActive && (
                        <button
                          onClick={() => {
                            setActivePlan(existingPlan.id);
                            setShowOverflowMenu(false);
                            navigate("/plans");
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 first:rounded-t-lg border-b border-slate-200"
                        >
                          Activate This Plan Now
                        </button>
                      )}

                      {!isNew && (
                        <button
                          onClick={() => {
                            handleDuplicate();
                            setShowOverflowMenu(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-200"
                        >
                          Duplicate Plan
                        </button>
                      )}

                      {!isNew && (
                        <button
                          onClick={() => {
                            if (existingPlan?.hasSnapshots) {
                              alert("Cannot delete plan with locked period snapshots.");
                              return;
                            }
                            setShowDeleteConfirm(true);
                            setShowOverflowMenu(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm last:rounded-b-lg transition-colors ${
                            existingPlan?.hasSnapshots
                              ? "text-slate-400 cursor-not-allowed hover:bg-transparent"
                              : "text-red-600 hover:bg-red-50"
                          }`}
                          title={existingPlan?.hasSnapshots ? "Cannot delete plan with locked period snapshots" : "Delete this plan"}
                        >
                          Delete Plan
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Plan Details */}
            <div className="lg:col-span-1">
              <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-6">
                {/* Plan Name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Plan Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Monthly Budget"
                    className={`w-full rounded-lg border px-3 py-2 text-sm placeholder-slate-400 focus:outline-none focus:ring-1 transition-colors ${
                      nameErrors.length > 0
                        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                        : "border-slate-300 focus:border-slate-900 focus:ring-slate-900"
                    }`}
                  />
                  {nameErrors.length > 0 && <p className="text-xs text-red-600 mt-1">{nameErrors[0]}</p>}
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-2">
                    Currency <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData((prev) => ({ ...prev, currency: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-colors"
                  >
                    <option>SGD</option>
                    <option>USD</option>
                    <option>EUR</option>
                    <option>GBP</option>
                    <option>JPY</option>
                    <option>AUD</option>
                  </select>
                </div>



                {/* Metadata */}
                {existingPlan && (
                  <div className="pt-4 border-t border-slate-200 space-y-3 text-xs">
                    <div>
                      <p className="text-slate-600">Last Updated</p>
                      <p className="text-slate-900 font-medium">
                        {new Date(existingPlan.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600">Status</p>
                      <p className="text-slate-900 font-medium">
                        {existingPlan.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            ✓ Active
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs">Inactive</span>
                        )}
                      </p>
                    </div>
                    {existingPlan.hasSnapshots && (
                      <div className="rounded-lg bg-amber-50 p-3 border border-amber-200 mt-4">
                        <p className="font-semibold text-amber-900 text-xs flex items-center gap-1">
                          <span>⚠</span> Used in Locked Periods
                        </p>
                        <p className="text-amber-800 text-xs mt-1">
                          This plan has been used in locked periods and cannot be deleted.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Allocation Targets */}
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-white p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Allocation Targets</h2>

                <DistributionTargetsEditor
                  allCategories={CATEGORIES}
                  value={formData.targets}
                  onChange={handleUpdateTargets}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Plan?</h3>
            <p className="text-sm text-slate-600 mb-6">
              Are you sure you want to delete "{existingPlan?.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 font-semibold text-white transition-colors"
              >
                Delete Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Confirm Modal */}
      <ConfirmLeaveModal
        isOpen={showConfirmLeave}
        isDirty={isDirty}
        onStay={handleStayAndEdit}
        onDiscard={handleDiscardChanges}
        message="You have unsaved changes to this distribution plan. Do you want to discard them?"
      />
    </div>
  );
}
