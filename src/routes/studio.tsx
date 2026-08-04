import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { ApiDown, Loading, Panel } from "@/components/console/primitives";
import { useKbEntry, useKnowledgeBase, useScenarioRunner } from "@/lib/api";
import { AlertTriangle, CheckCircle2, Info, Lightbulb, Play } from "lucide-react";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "Author Studio — VLAILA" }] }),
  component: Studio,
});

/** The shape the Studio needs out of a raw knowledge base entry. */
interface KbStepView {
  id: string;
  order: number;
  task: string;
  title: string;
  requires?: string[];
  optional?: boolean;
  milestone?: boolean;
  hints?: { nudge?: string };
}

interface KbErrorView {
  id: string;
  severity: "fatal" | "recoverable";
  message: string;
  confidence?: number;
  when?: {
    action?: string;
    selector?: string;
    frame?: string;
    on_task?: string;
  };
}

/**
 * The Author Studio.
 *
 * The proposal's fourth role. Knowledge base authoring -- not engineering -- is
 * what limits how fast VLAILA reaches all 1,500 experiments, so the people
 * writing entries need to see exactly what the assistant will say before it
 * ships to anyone's students. This replays a scripted student trajectory
 * against a live entry and shows the verdict for every event.
 */
function Studio() {
  const kb = useKnowledgeBase();
  const [experimentId, setExperimentId] = useState("");
  const selected = experimentId || kb.data?.[0]?.experiment_id || "";
  const entry = useKbEntry(selected);
  const runner = useScenarioRunner();

  const steps: KbStepView[] = useMemo(() => entry.data?.steps ?? [], [entry.data]);
  const errors: KbErrorView[] = useMemo(() => entry.data?.errors ?? [], [entry.data]);

  // Seed the scenario with the mistake the author most likely wants to test:
  // the first authored error pattern, replayed as the event that trips it.
  const seed = useMemo(() => {
    const first = errors[0];
    if (!first?.when) return "[]";
    const w = first.when;
    return JSON.stringify(
      [
        {
          action: w.action ?? "click",
          task: w.on_task ?? "Simulation",
          selector: (w.selector ?? "").split(",")[0].trim() || undefined,
          frame: w.frame ?? "host",
        },
      ],
      null,
      2,
    );
  }, [errors]);

  const [scenario, setScenario] = useState<string>("");
  const script = scenario || seed;

  const run = () => {
    let events: unknown;
    try {
      events = JSON.parse(script);
    } catch {
      return;
    }
    runner.mutate({ experimentId: selected, payload: { events } });
  };

  if (kb.isError)
    return (
      <PageLayout>
        <div className="console-scope max-w-5xl mx-auto p-6">
          <ApiDown error={kb.error} />
        </div>
      </PageLayout>
    );

  return (
    <PageLayout>
      <div className="console-scope max-w-6xl mx-auto px-4 py-6 space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-vlabs-blue">Author Studio</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Inspect an experiment's knowledge base entry and replay student behaviour against it.
            Whatever this page shows is exactly what a student would be told — the same rules engine
            answers both.
          </p>
        </header>

        {kb.isLoading ? (
          <Loading />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="block text-xs text-muted-foreground mb-1">Experiment</span>
                <select
                  value={selected}
                  onChange={(e) => {
                    setExperimentId(e.target.value);
                    setScenario("");
                    runner.reset();
                  }}
                  className="border rounded-lg px-3 py-2 bg-white min-w-[280px]"
                >
                  {(kb.data ?? []).map((e) => (
                    <option key={e.experiment_id} value={e.experiment_id}>
                      {e.discipline.split(" ")[0]} — {e.title.slice(0, 50)}
                    </option>
                  ))}
                </select>
              </label>
              {entry.data && (
                <div className="text-xs text-muted-foreground pb-2">
                  {steps.length} steps · {errors.length} error patterns ·{" "}
                  {entry.data.theory_chunks?.length ?? 0} retrieval chunks ·{" "}
                  {entry.data.quiz_bank?.length ?? 0} quiz items
                </div>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Panel title="Procedure">
                <ol className="space-y-2.5">
                  {steps.map((s) => (
                    <li key={s.id} className="text-sm flex gap-3">
                      <span className="text-xs text-muted-foreground tabular-nums w-5 pt-0.5">
                        {s.order}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2 flex-wrap">
                          {s.title}
                          <span className="text-[10px] uppercase tracking-wide bg-muted px-1.5 py-0.5 rounded">
                            {s.task}
                          </span>
                          {s.milestone && (
                            <span className="text-[10px] uppercase tracking-wide bg-vlabs-green/15 text-vlabs-green px-1.5 py-0.5 rounded">
                              milestone
                            </span>
                          )}
                          {s.optional && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              optional
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.hints?.nudge}</p>
                        {(s.requires?.length ?? 0) > 0 && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            requires: {s.requires?.join(", ")}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </Panel>

              <Panel title="Authored error patterns">
                <ul className="space-y-3">
                  {errors.map((e) => (
                    <li key={e.id} className="text-sm border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                            e.severity === "fatal"
                              ? "bg-vlabs-rose/15 text-vlabs-rose"
                              : "bg-vlabs-amber/20 text-vlabs-amber"
                          }`}
                        >
                          {e.severity}
                        </span>
                        <code className="text-xs text-muted-foreground">{e.id}</code>
                        {typeof e.confidence === "number" && e.confidence < 0.9 && (
                          <span className="text-[10px] text-muted-foreground">
                            conf {e.confidence} → delivered as a hint
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground">{e.message}</p>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            <Panel
              title="Scenario runner"
              actions={
                <button
                  onClick={run}
                  disabled={runner.isPending}
                  className="bg-vlabs-blue text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Play className="w-3 h-3" /> Replay
                </button>
              }
            >
              <p className="text-xs text-muted-foreground mb-2">
                A list of student events, in order. Each is replayed against the entry with session
                state carried forward, exactly as a live session would.
              </p>
              <textarea
                value={script}
                onChange={(e) => setScenario(e.target.value)}
                rows={8}
                spellCheck={false}
                className="w-full border rounded-lg p-3 font-mono text-xs resize-y bg-muted/30"
              />

              {runner.data && (
                <ul className="mt-4 space-y-2">
                  {runner.data.results.map((r, i) => (
                    <li key={i} className="border rounded-lg p-3 flex gap-3">
                      <VerdictIcon verdict={r.verdict} />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{r.verdict}</span>
                          {r.error_id && (
                            <code className="text-xs text-muted-foreground">{r.error_id}</code>
                          )}
                          {r.step_id && (
                            <code className="text-xs text-muted-foreground">step: {r.step_id}</code>
                          )}
                        </div>
                        {r.message && (
                          <p className="text-muted-foreground text-xs mt-1">{r.message}</p>
                        )}
                        <code className="block text-[11px] text-muted-foreground mt-1.5">
                          {JSON.stringify(r.event)}
                        </code>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </div>
    </PageLayout>
  );
}

function VerdictIcon({ verdict }: { verdict: string }) {
  const cls = "w-4 h-4 flex-none mt-0.5";
  if (verdict === "WARN") return <AlertTriangle className={`${cls} text-vlabs-rose`} />;
  if (verdict === "HINT") return <Lightbulb className={`${cls} text-vlabs-amber`} />;
  if (verdict === "CONCEPT") return <Info className={`${cls} text-vlabs-cyan`} />;
  return <CheckCircle2 className={`${cls} text-vlabs-green`} />;
}
