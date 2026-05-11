import { createFileRoute } from "@tanstack/react-router";
import { ORG_STATS } from "@/lib/mock-data";
export const Route = createFileRoute("/admin/trending")({
  component: () => (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-vlabs-blue">Trending Experiments</h1>
      <div className="bg-white border rounded divide-y">
        {ORG_STATS.trending.map(t => (
          <div key={t.name} className="p-3 flex items-center"><div className="flex-1">{t.name}</div><div className="text-sm text-muted-foreground mr-4">{t.sessions.toLocaleString()} sessions</div><div className="text-vlabs-green font-semibold">{t.trend}</div></div>
        ))}
      </div>
    </div>
  ),
});
