import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { useRole } from "@/lib/role";

export const Route = createFileRoute("/dashboard")({
  component: DashboardLayout,
});

function DashboardLayout() {
  const { role } = useRole();
  const loc = useLocation();
  const isRoot = loc.pathname === "/dashboard";

  // Faculty/Admin redirect at the visual level — show a different left nav
  const navs: Record<string, [string, string][]> = {
    student: [["/dashboard", "Overview"], ["/dashboard/assignments", "Assignments"], ["/dashboard/progress", "My Progress"], ["/dashboard/notifications", "Notifications"]],
    faculty: [["/faculty", "Overview"], ["/faculty/classes", "Classes"], ["/faculty/students", "Students"], ["/faculty/assignments", "Assign Experiments"], ["/faculty/analytics", "Class Analytics"], ["/faculty/hints", "Custom Hints"], ["/faculty/qa", "Ask VLAILA"]],
    admin: [["/admin", "Overview"], ["/admin/trending", "Trending"], ["/admin/struggling", "Struggling"], ["/admin/health", "Agent Health"], ["/admin/query", "NL Query"]],
    guest: [["/dashboard", "Sign in to access"]],
  };
  const items = navs[role] ?? navs.guest;

  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white border rounded p-3 text-sm h-fit">
          <div className="font-semibold text-vlabs-blue px-2 py-1 mb-1">{role.toUpperCase()}</div>
          {items.map(([to, label]) => (
            <Link key={to} to={to} className="block px-2 py-1.5 rounded hover:bg-muted" activeOptions={{ exact: true }} activeProps={{ className: "bg-accent text-vlabs-blue font-semibold" }}>{label}</Link>
          ))}
        </aside>
        <div>{isRoot ? <StudentOverview /> : <Outlet />}</div>
      </div>
    </PageLayout>
  );
}

function StudentOverview() {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-vlabs-blue to-vlabs-cyan text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold">Welcome back, Aarav!</h1>
        <p className="opacity-90 mt-1">You have 2 assignments due this week.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        {[["Assigned", "5"], ["Completed", "12"], ["Avg. score", "84%"]].map(([l,v]) => (
          <div key={l} className="bg-white border rounded p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-2xl font-bold text-vlabs-blue">{v}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Recent labs</h3>
        <div className="text-sm space-y-1">
          <Link to="/labs/$labId/experiments/$expId" params={{ labId: "psychological-process", expId: "colour-blindness" }} className="vlabs-link block">Colour Blindness — Psychological Process</Link>
          <Link to="/labs/$labId" params={{ labId: "drone-tech" }} className="vlabs-link block">Drone Technology Lab</Link>
        </div>
      </div>
    </div>
  );
}
