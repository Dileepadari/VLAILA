import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { ApiDown, Loading, Panel, Stat } from "@/components/console/primitives";
import { useAgentHealth, useHealth, useOrgStats } from "@/lib/api";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin")({ component: AdminLayout });

const NAV: [string, string][] = [
  ["/admin", "Overview"],
  ["/admin/trending", "Trending"],
  ["/admin/struggling", "Struggling labs"],
  ["/admin/health", "Agent health"],
  ["/admin/query", "Ask the data"],
];

function AdminLayout() {
  const loc = useLocation();
  const isRoot = loc.pathname === "/admin";
  const { data: health } = useHealth();

  return (
    <PageLayout>
      <div className="console-scope max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="h-fit">
          <nav className="bg-white border rounded-xl p-2 text-sm">
            <div className="font-semibold text-vlabs-blue px-2 py-1.5 text-xs uppercase tracking-wide">
              Administrator
            </div>
            {NAV.map(([to, label]) => (
              <Link
                key={to}
                to={to}
                className="block px-2 py-1.5 rounded-lg hover:bg-muted"
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-accent text-vlabs-blue font-semibold" }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Which reasoning tier is actually serving traffic is the first
              thing an administrator asks when the numbers look odd. */}
          {health && (
            <div className="mt-3 bg-white border rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${health.degraded ? "bg-vlabs-amber" : "bg-vlabs-green"}`}
                />
                <span className="font-medium">
                  {health.degraded ? "Rules-only mode" : "Full reasoning"}
                </span>
              </div>
              <div className="text-muted-foreground">Provider: {health.llm_provider}</div>
              <div className="text-muted-foreground">
                {health.knowledge_base_entries} experiments authored
              </div>
            </div>
          )}
        </aside>

        <div>{isRoot ? <AdminOverview /> : <Outlet />}</div>
      </div>
    </PageLayout>
  );
}

function AdminOverview() {
  const stats = useOrgStats();
  const agent = useAgentHealth();

  if (stats.isError) return <ApiDown error={stats.error} />;
  if (stats.isLoading || !stats.data) return <Loading label="Loading platform statistics…" />;

  const d = stats.data;
  const a = agent.data;

  return (
    <div className="space-y-5">
      <header className="bg-gradient-to-br from-vlabs-navy to-vlabs-blue text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold">Organisation dashboard</h1>
        <p className="opacity-90 mt-1 text-sm">
          Live figures from every VLAILA session recorded across enrolled institutes.
        </p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Sessions (30 days)" value={d.active_sessions_30d.toLocaleString()} />
        <Stat label="Sessions all time" value={d.sessions_all_time.toLocaleString()} />
        <Stat label="This month" value={d.sessions_this_month.toLocaleString()} />
        <Stat label="Avg session" value={`${d.avg_session_minutes} min`} />
      </div>

      <Panel title="Sessions per day (last 14 days)">
        {d.daily.some((x) => x.sessions > 0) ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={d.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="var(--color-vlabs-blue)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No sessions recorded yet. Open an experiment with the widget installed and this fills
            in.
          </p>
        )}
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Sessions by broad area">
          {d.by_discipline.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.by_discipline} layout="vertical" margin={{ left: 30 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  width={140}
                  tickFormatter={(v: string) => (v.length > 24 ? `${v.slice(0, 23)}…` : v)}
                />
                <Tooltip />
                <Bar dataKey="sessions" fill="var(--color-vlabs-cyan)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">No data yet.</p>
          )}
        </Panel>

        <Panel title="Agent health">
          {a ? (
            <div className="grid grid-cols-2 gap-3">
              <Stat
                label="Hint acceptance"
                value={`${a.acceptance_rate}%`}
                tone={a.acceptance_rate >= 60 ? "good" : "warn"}
                hint="Target > 60%"
              />
              <Stat
                label="False positives"
                value={`${a.false_positive_rate}%`}
                tone={a.false_positive_rate < 5 ? "good" : "bad"}
                hint="Target < 5%"
              />
              <Stat label="p95 latency" value={`${a.p95_latency_ms} ms`} />
              <Stat label="Interventions" value={a.interventions.toLocaleString()} />
            </div>
          ) : (
            <Loading />
          )}
        </Panel>
      </div>
    </div>
  );
}
