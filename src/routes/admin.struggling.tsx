import { createFileRoute } from "@tanstack/react-router";
import { ORG_STATS } from "@/lib/mock-data";
export const Route = createFileRoute("/admin/struggling")({
  component: () => (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-vlabs-blue">Struggling Experiments</h1>
      <p className="text-sm text-muted-foreground">Labs with high abandonment — flag for UX or content improvement.</p>
      <div className="bg-white border rounded divide-y">
        {ORG_STATS.struggling.map(s => (
          <div key={s.name} className="p-3">
            <div className="flex justify-between"><span className="font-semibold">{s.name}</span><span className="text-vlabs-rose">{s.abandon}% abandoned</span></div>
            <div className="h-2 bg-muted rounded mt-2"><div className="h-2 bg-vlabs-rose rounded" style={{ width: `${s.abandon}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  ),
});
