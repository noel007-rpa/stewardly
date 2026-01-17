import { Link } from "react-router-dom";

export function OnboardingWelcome() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Welcome to Stewardly</h1>
      <p className="mt-2 text-slate-600">
        Stewardly is distribution-first: you plan where money goes before it is
        spent.
      </p>

      <div className="mt-6 flex gap-3">
        <Link
          to="/onboarding/income"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Start onboarding
        </Link>
        <Link
          to="/login"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
