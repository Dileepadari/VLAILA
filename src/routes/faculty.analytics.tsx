import { createFileRoute } from "@tanstack/react-router";
import { CLASS_ANALYTICS } from "@/lib/mock-data";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LineChart, Line } from "recharts";
export const Route = createFileRoute("/faculty/analytics")({
  component: () => (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-vlabs-blue">Class Analytics — {CLASS_ANALYTICS.experiment}</h1>
      <div className="grid md:grid-cols-3 gap-3">
        {[["Completion rate", `${CLASS_ANALYTICS.completionRate}%`], ["Avg duration", CLASS_ANALYTICS.avgDuration], ["Drop-off step", "Switch CVD mode"]].map(([l,v]) => (
          <div key={l} className="bg-white border rounded p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold text-vlabs-blue">{v}</div></div>
        ))}
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Confusion per step</h3>
        <ResponsiveContainer width="100%" height={240}><BarChart data={CLASS_ANALYTICS.steps}><XAxis dataKey="step" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={70} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="confusion" fill="var(--color-vlabs-rose)" /></BarChart></ResponsiveContainer>
      </div>
      <div className="bg-white border rounded p-4">
        <h3 className="font-semibold mb-2">Drop-off per step</h3>
        <ResponsiveContainer width="100%" height={220}><LineChart data={CLASS_ANALYTICS.steps}><XAxis dataKey="step" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={70} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="dropoff" stroke="var(--color-vlabs-blue)" strokeWidth={2} /></LineChart></ResponsiveContainer>
      </div>
    </div>
  ),
});
