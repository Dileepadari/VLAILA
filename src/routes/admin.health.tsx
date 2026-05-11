import { createFileRoute } from "@tanstack/react-router";
import { HEALTH } from "@/lib/mock-data";
export const Route = createFileRoute("/admin/health")({
  component: () => (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-vlabs-blue">Agent Health Monitor</h1>
      <div className="grid md:grid-cols-3 gap-3">
        {[
          ["Uptime", `${HEALTH.uptime}%`],
          ["p50 latency", `${HEALTH.p50}ms`],
          ["p95 latency", `${HEALTH.p95}ms`],
          ["LLM cost (today)", `$${HEALTH.costToday}`],
          ["Hint acceptance", `${HEALTH.hintAcceptance}%`],
          ["False-positive rate", `${HEALTH.fpRate}%`],
        ].map(([l, v]) => (
          <div key={l} className="bg-white border rounded p-4"><div className="text-xs text-muted-foreground">{l}</div><div className="text-xl font-bold text-vlabs-blue">{v}</div></div>
        ))}
      </div>
    </div>
  ),
});
