import { Link } from "react-router-dom";

export function SetupDistribution() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Onboarding: Distribution</h1>
      <p className="mt-2 text-slate-600">
        Next we will set your categories and target allocations.
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          to="/dashboard/cashflow"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Finish
        </Link>
        <Link
          to="/onboarding/income"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
