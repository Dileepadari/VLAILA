import { createFileRoute } from "@tanstack/react-router";
import { ApiDown, Bar, Loading, Panel, Stat } from "@/components/console/primitives";
import { useAgentHealth, useHealth } from "@/lib/api";

export const Route = createFileRoute("/admin/health")({ component: AgentHealthPage });

/** How much traffic each rung of the reasoning ladder actually answered. */
const TIER_LABEL: Record<string, string> = {
  rules: "Tier 1 · rules engine",
  small: "Tier 2 · small model",
  frontier: "Tier 3 · frontier model",
  offline: "Offline fallback",
};

function AgentHealthPage() {
  const agent = useAgentHealth();
  const health = useHealth();

  if (agent.isError) return <ApiDown error={agent.error} />;
  if (agent.isLoading || !agent.data) return <Loading />;

  const a = agent.data;
  const resolved = a.accepted + a.dismissed + a.reported_wrong;
  const tiers = Object.entries(a.tier_mix).sort((x, y) => y[1] - x[1]);
  const tierTotal = tiers.reduce((sum, [, n]) => sum + n, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-vlabs-blue">Agent health</h1>
        <p className="text-sm text-muted-foreground mt-1">
          How VLAILA itself is performing. Acceptance rate and false-positive rate are the two
          numbers that decide whether students keep trusting it.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
        <Stat label="p50 latency" value={`${a.p50_latency_ms} ms`} />
        <Stat
          label="p95 latency"
          value={`${a.p95_latency_ms} ms`}
          tone={a.p95_latency_ms < 2000 ? "good" : "warn"}
          hint="Target < 2s"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel title="Intervention outcomes">
          <div className="space-y-3 text-sm">
            {(
              [
                ["Acted on", a.accepted, "green"],
                ["Dismissed", a.dismissed, "amber"],
                ["Reported wrong", a.reported_wrong, "rose"],
              ] as const
            ).map(([label, value, tone]) => (
              <div key={label}>
                <div className="flex justify-between mb-1">
                  <span>{label}</span>
                  <span className="tabular-nums text-muted-foreground">{value}</span>
                </div>
                <Bar value={value} max={Math.max(1, resolved)} tone={tone} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              {a.interventions} intervention{a.interventions === 1 ? "" : "s"} fired, {resolved}{" "}
              answered by a student.
            </p>
          </div>
        </Panel>

        <Panel title="Which tier answered">
          {tiers.length ? (
            <div className="space-y-3 text-sm">
              {tiers.map(([tier, n]) => (
                <div key={tier}>
                  <div className="flex justify-between mb-1">
                    <span>{TIER_LABEL[tier] ?? tier}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {Math.round((n * 100) / Math.max(1, tierTotal))}%
                    </span>
                  </div>
                  <Bar value={n} max={tierTotal} tone={tier === "rules" ? "green" : "cyan"} />
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                The rules engine answering most traffic is the design working: procedural errors are
                a deterministic problem, and paying a model to re-derive them costs money and
                latency for no gain.
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No interventions recorded yet.</p>
          )}
        </Panel>
      </div>

      {health.data && (
        <Panel title="Runtime">
          <dl className="grid sm:grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">API version</dt>
              <dd className="font-medium">{health.data.version}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Reasoning provider</dt>
              <dd className="font-medium">
                {health.data.llm_provider}
                {health.data.degraded && (
                  <span className="ml-2 text-xs text-vlabs-amber">rules-only</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Knowledge base</dt>
              <dd className="font-medium">{health.data.knowledge_base_entries} experiments</dd>
            </div>
          </dl>
        </Panel>
      )}
    </div>
  );
}
