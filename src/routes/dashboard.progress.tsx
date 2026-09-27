import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/dashboard/progress")({
  component: () => (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-vlabs-blue">My Progress</h1>
      <div className="bg-white border rounded p-4">
        {[
          ["Psychological Process", 78],
          ["Drone Technology", 40],
          ["VR Lab", 12],
        ].map(([n, p]) => (
          <div key={n as string} className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span>{n}</span>
              <span>{p}%</span>
            </div>
            <div className="h-2 bg-muted rounded">
              <div className="h-2 bg-vlabs-blue rounded" style={{ width: `${p}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="bg-white border rounded p-4 text-sm">
        <h3 className="font-semibold mb-2">VLAILA Insights</h3>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>
            Your fastest experiment was <strong>Stroop Effect</strong> — 7m 12s.
          </li>
          <li>You used 14 hints across 12 experiments. Hint acceptance: 82%.</li>
          <li>
            Suggested next experiment: <strong>Visual Search — Singleton & Conjunctive</strong>.
          </li>
        </ul>
      </div>
    </div>
  ),
});
