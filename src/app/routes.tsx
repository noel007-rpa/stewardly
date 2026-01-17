import { Transactions } from "../pages/transactions/Transactions";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "../components/layout/AppShell";
import { ProtectedRoute } from "./ProtectedRoute";
import { getSession } from "../state/sessionStore";
import { Login } from "../pages/auth/Login";
import { CashFlow } from "../pages/dashboard/CashFlow";
import { DistributionHealth } from "../pages/dashboard/DistributionHealth";
import { NetWorthDashboard } from "../pages/dashboard/NetWorth";
import { IncomeList } from "../pages/income/IncomeList";
import { Plans } from "../pages/distribution/Plans";
import { PlanEditor } from "../pages/distribution/PlanEditor";
import { PeriodAllocation } from "../pages/distribution/PeriodAllocation";
import { Assets } from "../pages/networth/Assets";
import { Liabilities } from "../pages/networth/Liabilities";
import { MonthlyReport } from "../pages/reports/MonthlyReport";
import { ScheduledTransactions } from "../pages/operations/ScheduledTransactions";
import { ReleaseReadiness } from "../pages/settings/ReleaseReadiness";

function IndexRedirect() {
  const { accessToken } = getSession();
  return accessToken ? (
    <Navigate to="/dashboard/cashflow" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

export const router = createBrowserRouter([
  { path: "/", element: <IndexRedirect /> },

  { path: "/login", element: <Login /> },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "/dashboard", element: <Navigate to="/dashboard/cashflow" replace /> },
          { path: "/dashboard/cashflow", element: <CashFlow /> },
          { path: "/dashboard/distribution", element: <DistributionHealth /> },
          { path: "/dashboard/networth", element: <NetWorthDashboard /> },
          { path: "/dashboard/transactions", element: <Transactions /> },
          { path: "/income", element: <IncomeList /> },
          { path: "/plans", element: <Plans /> },
          { path: "/plans/new", element: <PlanEditor /> },
          { path: "/plans/:id/edit", element: <PlanEditor /> },
          { path: "/distribution/period", element: <PeriodAllocation /> },
          { path: "/operations/scheduled", element: <ScheduledTransactions /> },
          { path: "/networth/assets", element: <Assets /> },
          { path: "/networth/liabilities", element: <Liabilities /> },
          { path: "/reports/monthly", element: <MonthlyReport /> },
          { path: "/settings/release", element: <ReleaseReadiness /> },
        ],
      },
    ],
  },

  { path: "*", element: <Navigate to="/" replace /> },
]);
