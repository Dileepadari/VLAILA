import { createFileRoute } from "@tanstack/react-router";
import { ApiDown, Bar, Empty, Loading, Panel } from "@/components/console/primitives";
import { useAgentHealth, useKnowledgeBase, useOrgStats } from "@/lib/api";
import { Flag } from "lucide-react";

export const Route = createFileRoute("/admin/struggling")({ component: Struggling });

function Struggling() {
  const stats = useOrgStats();
  const agent = useAgentHealth();
  const kb = useKnowledgeBase();

  if (stats.isError) return <ApiDown error={stats.error} />;
  if (stats.isLoading || !stats.data) return <Loading />;

  const titles = new Map((kb.data ?? []).map((e) => [e.experiment_id, e.title]));
  const rows = stats.data.struggling;
  const flagged = agent.data?.flagged_experiments ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-vlabs-blue">Struggling labs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Experiments students abandon most often. A low completion rate is usually a content or UX
          problem in the lab itself rather than a problem with the cohort.
        </p>
      </div>

      <Panel title="Lowest completion rate">
        {rows.length ? (
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.experiment_id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-sm">
                    {titles.get(row.experiment_id) ?? row.experiment_id}
                  </span>
                  <span className="text-sm text-vlabs-rose tabular-nums">
                    {row.abandon}% abandoned
                  </span>
                </div>
                <div className="mt-2">
                  <Bar value={row.abandon} max={100} tone="rose" />
                </div>
                <div className="text-xs text-muted-foreground mt-1.5">
                  {row.sessions} session{row.sessions === 1 ? "" : "s"} · {row.completion}%
                  completed
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="Nothing to flag yet"
            body="Completion rates appear once sessions have been recorded for an experiment."
          />
        )}
      </Panel>

      {/* The agent's own feedback loop: an experiment whose hints keep getting
          dismissed is a knowledge base problem, not a student problem. */}
      <Panel title="Flagged by the agent">
        {flagged.length ? (
          <ul className="space-y-2">
            {flagged.map((f) => (
              <li
                key={f.experiment_id}
                className="flex items-center gap-3 text-sm border rounded-lg px-3 py-2"
              >
                <Flag className="w-4 h-4 text-vlabs-amber flex-none" />
                <span className="flex-1 font-medium">
                  {titles.get(f.experiment_id) ?? f.experiment_id}
                </span>
                <span className="text-muted-foreground text-xs">
                  {f.dismiss_rate}% of hints dismissed over {f.interventions} interventions
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No experiment has crossed the 30% dismissal threshold. When one does, it appears here
            for a knowledge base review.
          </p>
        )}
      </Panel>
    </div>
  );
}
