import { NavLink } from "react-router-dom";

type NavItem = { label: string; to: string };

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="px-3 py-4">
      <div className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </div>
      <div className="mt-2 space-y-1">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            className={({ isActive }) =>
              [
                "block rounded-lg px-3 py-2 text-sm",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100",
              ].join(" ")
            }
          >
            {it.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function SideNav() {
  return (
    <nav className="h-[calc(100vh-3.5rem)] overflow-auto">
      <NavSection
        title="Dashboards"
        items={[
          { label: "Cash Flow", to: "/dashboard/cashflow" },
          { label: "Distribution Health", to: "/dashboard/distribution" },
          { label: "Net Worth", to: "/dashboard/networth" },
        ]}
      />

      <NavSection
        title="Reports"
        items={[
          { label: "Monthly Report", to: "/reports/monthly" },
        ]}
      />

      <NavSection
        title="Operations"
        items={[
          { label: "Income", to: "/income" },
          { label: "Plans", to: "/plans" },
          { label: "Period Allocation", to: "/distribution/period" },
          { label: "Scheduled Transactions", to: "/operations/scheduled" },
          { label: "Transactions", to: "/dashboard/transactions" },
        ]}
      />

      <NavSection
        title="Net Worth"
        items={[
          { label: "Assets", to: "/networth/assets" },
          { label: "Liabilities", to: "/networth/liabilities" },
        ]}
      />

      <NavSection
        title="Admin"
        items={[
          { label: "Release Readiness", to: "/settings/release" },
        ]}
      />
    </nav>
  );
}
