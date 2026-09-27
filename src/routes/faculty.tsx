import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { CLASS_ANALYTICS, STUDENTS } from "@/lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/faculty")({ component: FacultyLayout });

function FacultyLayout() {
  const loc = useLocation();
  const isRoot = loc.pathname === "/faculty";
  const items: [string, string][] = [
    ["/faculty", "Overview"],
    ["/faculty/classes", "Classes"],
    ["/faculty/students", "Students"],
    ["/faculty/assignments", "Assign Experiments"],
    ["/faculty/analytics", "Class Analytics"],
    ["/faculty/hints", "Custom Hints"],
    ["/faculty/qa", "Ask VLAILA"],
  ];
  return (
    <PageLayout>
      <div className="console-scope max-w-7xl mx-auto px-4 py-6 grid md:grid-cols-[220px_1fr] gap-6">
        <aside className="bg-white border rounded p-3 text-sm h-fit">
          <div className="font-semibold text-vlabs-blue px-2 py-1 mb-1">FACULTY</div>
          {items.map(([to, l]) => (
            <Link
              key={to}
              to={to}
              className="block px-2 py-1.5 rounded hover:bg-muted"
              activeOptions={{ exact: true }}
              activeProps={{ className: "bg-accent text-vlabs-blue font-semibold" }}
            >
              {l}
            </Link>
          ))}
        </aside>
        <div>{isRoot ? <FacultyOverview /> : <Outlet />}</div>
      </div>
    </PageLayout>
  );
}

function FacultyOverview() {
  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-vlabs-navy to-vlabs-blue text-white rounded-xl p-6">
        <h1 className="text-2xl font-bold">Welcome, Dr. Sharma</h1>
        <p className="opacity-90 mt-1">3 classes · 86 students · 12 active assignments</p>
      </div>
      <div className="grid md:grid-cols-4 gap-3">
        {[
          ["Classes", "3"],
          ["Students", "86"],
          ["Avg completion", "78%"],
          ["Pain-points flagged", "5"],
        ].map(([l, v]) => (
          <div key={l} className="bg-white border rounded p-4">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className="text-2xl font-bold text-vlabs-blue">{v}</div>
          </div>
        ))}
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-3">Confusion heatmap — Colour Blindness</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={CLASS_ANALYTICS.steps}>
            <XAxis
              dataKey="step"
              tick={{ fontSize: 10 }}
              angle={-15}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="confusion" fill="var(--color-vlabs-rose)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white border rounded p-4 text-sm">
        <h3 className="font-semibold mb-2">VLAILA teaching suggestion</h3>
        <p className="text-muted-foreground">
          Based on class errors, consider reviewing <strong>cone biology</strong> before the
          simulation step. 41% confusion rate on switching CVD modes suggests the prerequisite isn't
          sticking.
        </p>
      </div>
    </div>
  );
}

export { STUDENTS };
