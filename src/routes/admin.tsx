import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { ORG_STATS, HEALTH } from "@/lib/mock-data";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

function AdminLayout() {
  const loc = useLocation();
  const isRoot = loc.pathname === "/admin";
  const items: [string, string][] = [
    ["/admin", "Overview"], ["/admin/trending", "Trending"],
    ["/admin/struggling", "Struggling Labs"], ["/admin/health", "Agent Health"], ["/admin/query", "NL Query"],
  ];
  return (
    <PageLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white border rounded p-3 text-sm h-fit">
          <div className="font-semibold text-vlabs-blue px-2 py-1 mb-1">ADMIN</div>
          {items.map(([to,l])=>(<Link key={to} to={to} className="block px-2 py-1.5 rounded hover:bg-muted" activeOptions={{exact:true}} activeProps={{className:"bg-accent text-vlabs-blue font-semibold"}}>{l}</Link>))}
        </aside>
        <div>{isRoot ? <AdminOverview /> : <Outlet />}</div>
      </div>
    </PageLayout>
  );
}

function AdminOverview() {
  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-vlabs-navy to-vlabs-blue text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold">Organization Dashboard</h1>
        <p className="opacity-90 mt-1">Strategic intelligence across all institutes.</p>
      </div>
      <div className="grid md:grid-cols-4 gap-3">
        {[
          ["Active users (30d)", ORG_STATS.activeUsers30d.toLocaleString()],
          ["Experiments (all-time)", ORG_STATS.experimentsAllTime.toLocaleString()],
          ["This month", ORG_STATS.experimentsThisMonth.toLocaleString()],
          ["Avg session", `${ORG_STATS.avgSessionMinutes}m`],
        ].map(([l,v])=>(<div key={l} className="bg-white border rounded p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold text-vlabs-blue">{v}</div></div>))}
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Daily active users (14d)</h3>
        <ResponsiveContainer width="100%" height={220}><LineChart data={ORG_STATS.daily}><XAxis dataKey="day" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} /><Tooltip /><Line type="monotone" dataKey="users" stroke="var(--color-vlabs-blue)" strokeWidth={2} /></LineChart></ResponsiveContainer>
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Sessions by discipline</h3>
        <ResponsiveContainer width="100%" height={220}><BarChart data={ORG_STATS.byDiscipline}><XAxis dataKey="name" tick={{fontSize:10}} /><YAxis tick={{fontSize:10}} /><Tooltip /><Bar dataKey="sessions" fill="var(--color-vlabs-cyan)" /></BarChart></ResponsiveContainer>
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Card label="Hint acceptance" value={`${HEALTH.hintAcceptance}%`} />
        <Card label="Uptime" value={`${HEALTH.uptime}%`} />
        <Card label="False-positive rate" value={`${HEALTH.fpRate}%`} />
      </div>
    </div>
  );
}
function Card({label,value}:{label:string;value:string}) { return <div className="bg-white border rounded p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="text-xl font-bold text-vlabs-blue">{value}</div></div>; }
