import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDistributionPlan, setDistributionPlan } from "../../state/distributionPlanStore";

export function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, isLoading, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);

    if (!email || !password) {
      setFeedback("Email and password are required");
      return;
    }

    if (isSignUp) {
      // Sign up flow
      const result = await signUp(email, password);
      if (result.success) {
        setFeedback(result.message || "Sign up successful!");
        // Stay on login page for now - user needs to verify email or can sign in
      }
    } else {
      // Sign in flow
      const result = await signIn(email, password);
      if (result.success) {
        // Initialize default plan if needed (preserve existing data)
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
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-md p-6 pt-16">
        <div className="rounded-2xl bg-white p-6 shadow">
          <div className="text-xl font-semibold">Stewardly</div>
          <div className="mt-1 text-sm text-slate-600">
            {isSignUp ? "Create your account" : "Sign in to your account"}
          </div>

          <form className="mt-6 space-y-4" onSubmit={onSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={isLoading}
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
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {feedback && (
              <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700 border border-blue-200">
                {feedback}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Loading..." : isSignUp ? "Sign up" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFeedback(null);
              }}
              disabled={isLoading}
              className="w-full text-sm text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Need an account? Sign up"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
            <div className="mb-2">
              <strong>Authentication:</strong> Powered by Supabase
            </div>
            <div>
              <strong>Your data:</strong> Plans, transactions, and reports are stored
              locally in your browser.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
