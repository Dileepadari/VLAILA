import { createFileRoute } from "@tanstack/react-router";
import { ApiDown, Bar, Empty, Loading, Panel } from "@/components/console/primitives";
import { useKnowledgeBase, useOrgStats } from "@/lib/api";

export const Route = createFileRoute("/admin/trending")({ component: Trending });

function Trending() {
  const stats = useOrgStats();
  const kb = useKnowledgeBase();

  if (stats.isError) return <ApiDown error={stats.error} />;
  if (stats.isLoading || !stats.data) return <Loading />;

  const titles = new Map((kb.data ?? []).map((e) => [e.experiment_id, e.title]));
  const rows = stats.data.trending;
  const max = rows[0]?.sessions ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-vlabs-blue">Trending experiments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ranked by sessions recorded. Useful for spotting which labs are carrying the platform's
          load and which are being adopted after a curriculum change.
        </p>
      </div>

      <Panel>
        {rows.length ? (
          <ol className="divide-y">
            {rows.map((row, i) => (
              <li key={row.experiment_id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums w-5">{i + 1}</span>
                  <span className="flex-1 font-medium text-sm">
                    {titles.get(row.experiment_id) ?? row.experiment_id}
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {row.sessions.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 ml-8">
                  <Bar value={row.sessions} max={max} tone="cyan" />
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <Empty
            title="No sessions recorded yet"
            body="Once the widget is live on a lab, the experiments students actually run appear here."
          />
        )}
      </Panel>
    </div>
  );
}
