import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setSession } from "../../state/sessionStore";
import { getDistributionPlan, setDistributionPlan } from "../../state/distributionPlanStore";
import { CATEGORIES } from "../../constants/categories";

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@stewardly.app");
  const [password, setPassword] = useState("demo");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Demo-only login (replace with API later)
    setSession("demo_token", {
      user_id: "demo_user",
      email,
      timezone: "Asia/Singapore",
      preferred_currency: "SGD",
    });

    if (!getDistributionPlan()) {
      setDistributionPlan({
        id: "default",
        name: "Default Plan",
        currency: "SGD",
        updatedAt: new Date().toISOString(),
        targets: [
          { category: "Living", targetPct: 50 },
          { category: "Savings", targetPct: 10 },
          { category: "Investments", targetPct: 15 },
          { category: "Debt", targetPct: 10 },
          { category: "Protection", targetPct: 5 },
          { category: "SupportGiving", targetPct: 5 },
          { category: "Taxes", targetPct: 5 },
          { category: "Education", targetPct: 0 },
        ],
      });
    }

    navigate("/dashboard/cashflow");
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md p-6 pt-16">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-xl font-semibold">Stewardly</div>
          <div className="mt-1 text-sm text-slate-600">Sign in (demo)</div>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800">
              Continue
            </button>

            <div className="text-xs text-slate-500">
              Demo only. Real authentication comes next.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
