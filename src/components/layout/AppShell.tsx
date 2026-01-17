import { Outlet } from "react-router-dom";
import { SideNav } from "./SideNav";
import { TopNav } from "./TopNav";

export function AppShell() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div data-print="hide">
        <TopNav />
      </div>

      <div className="pt-14">
        <div className="mx-auto flex max-w-7xl">
          {/* Sidebar (hidden on small screens) */}
          <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block" data-print="hide">
            <SideNav />
          </aside>

          {/* Main */}
          <main className="min-w-0 flex-1 p-6 print-avoid-break" data-print="page">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
