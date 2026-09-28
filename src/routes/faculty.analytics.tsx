import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ApiDown, Empty, Loading, Panel, Stat } from "@/components/console/primitives";
import { useClassAnalytics, useKnowledgeBase, useStudents, useTeachingSuggestion } from "@/lib/api";
import { Lightbulb } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/faculty/analytics")({ component: ClassAnalyticsPage });

const INSTITUTION = "IIIT Hyderabad";

/**
 * A word rather than a number.
 *
 * The struggle score is a derived 0-1 quantity with no natural unit, and
 * showing "0.42" invites an instructor to treat it as a measurement they can
 * compare across cohorts. A band is honest about the precision it has.
 */
function strainLabel(struggle: number): string {
  if (struggle >= 0.55) return "Hard going";
  if (struggle >= 0.3) return "Some friction";
  if (struggle > 0.1) return "Mostly smooth";
  return "Smooth";
}

function ClassAnalyticsPage() {
  const kb = useKnowledgeBase();
  const [experimentId, setExperimentId] = useState<string>("");
  const selected = experimentId || kb.data?.[0]?.experiment_id || "";

  const analytics = useClassAnalytics(selected, INSTITUTION);
  const suggestion = useTeachingSuggestion(selected, INSTITUTION);
  const students = useStudents(selected, INSTITUTION);

  if (kb.isError) return <ApiDown error={kb.error} />;
  if (kb.isLoading) return <Loading />;

  const a = analytics.data;
  const maxConfusion = Math.max(1, ...(a?.steps ?? []).map((s) => s.confusion));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl font-bold text-vlabs-blue">Class analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Where your students actually struggle, step by step.
          </p>
        </div>
        <label className="text-sm">
          <span className="block text-xs text-muted-foreground mb-1">Experiment</span>
          <select
            value={selected}
            onChange={(e) => setExperimentId(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white min-w-[220px]"
          >
            {(kb.data ?? []).map((e) => (
              <option key={e.experiment_id} value={e.experiment_id}>
                {e.title.length > 46 ? `${e.title.slice(0, 45)}…` : e.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {analytics.isLoading || !a ? (
        <Loading />
      ) : a.sessions === 0 ? (
        <Empty
          title="No sessions for this experiment yet"
          body="Analytics appear once your students have run this experiment with the assistant enabled."
        />
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3">
            <Stat
              label="Completion rate"
              value={`${a.completion_rate}%`}
              tone={a.completion_rate >= 70 ? "good" : "warn"}
            />
            <Stat
              label="Average duration"
              value={`${Math.round(a.avg_duration_seconds / 60)} min`}
            />
            <Stat label="Sessions" value={a.sessions} />
          </div>

          {suggestion.data?.suggestion && (
            <div className="bg-accent/60 border border-vlabs-cyan/30 rounded-xl p-4 flex gap-3">
              <Lightbulb className="w-4 h-4 text-vlabs-blue flex-none mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold mb-1">Teaching suggestion</div>
                <p className="text-muted-foreground">{suggestion.data.suggestion}</p>
              </div>
            </div>
          )}

          {a.behaviour && a.behaviour.sessions_reporting > 0 && (
            <Panel title="How the class found it">
              <p className="text-xs text-muted-foreground -mt-1 mb-3">
                Read from how students worked - pauses, retries and time away - across{" "}
                {a.behaviour.sessions_reporting}{" "}
                {a.behaviour.sessions_reporting === 1 ? "session" : "sessions"}. This is about the
                shape of the effort, not about who was trying hardest.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 mb-4">
                <Stat
                  label="Effort level"
                  value={strainLabel(a.behaviour.avg_struggle)}
                  hint="Higher means more retries and changes of mind"
                  tone={a.behaviour.avg_struggle > 0.4 ? "warn" : "good"}
                />
                <Stat
                  label="Stayed on task"
                  value={`${Math.round(a.behaviour.avg_focus * 100)}%`}
                  hint="Time on the page rather than away from it"
                  tone={a.behaviour.avg_focus < 0.6 ? "warn" : "good"}
                />
                <Stat
                  label="Needing a look"
                  value={a.behaviour.strained_sessions}
                  hint={`of ${a.behaviour.sessions_reporting} sessions`}
                  tone={a.behaviour.strained_sessions > 0 ? "warn" : "good"}
                />
              </div>

              {a.behaviour.friction.length > 0 ? (
                <ul className="space-y-2">
                  {a.behaviour.friction.map((f) => (
                    <li key={f.kind} className="flex items-center gap-3 text-sm">
                      <span className="flex-1">{f.label}</span>
                      {/* The bar is the share of the class, so two rows are
                          comparable without reading the numbers. */}
                      <span className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-vlabs-amber"
                          style={{ width: `${Math.max(4, f.share)}%` }}
                        />
                      </span>
                      <span className="w-24 text-right tabular-nums text-muted-foreground text-xs">
                        {f.share}% · {f.sessions}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No friction patterns stood out - the class worked through this one cleanly.
                </p>
              )}
            </Panel>
          )}

          <Panel title="Where students get stuck">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={a.steps} margin={{ bottom: 40 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="title"
                  tick={{ fontSize: 9 }}
                  angle={-22}
                  textAnchor="end"
                  height={70}
                  interval={0}
                  tickFormatter={(v: string) => (v.length > 18 ? `${v.slice(0, 17)}…` : v)}
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                {/* Colour intensity tracks confusion, so the worst step is
                    findable at a glance without reading any axis. */}
                <Bar dataKey="confusion" radius={[4, 4, 0, 0]}>
                  {a.steps.map((s) => (
                    <Cell
                      key={s.step_id}
                      fill={
                        s.confusion >= maxConfusion * 0.66
                          ? "var(--color-vlabs-rose)"
                          : s.confusion >= maxConfusion * 0.33
                            ? "var(--color-vlabs-amber)"
                            : "var(--color-vlabs-cyan)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Step-by-step breakdown">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-xs text-muted-foreground border-b">
                  <tr>
                    <th className="text-left font-medium py-2">Step</th>
                    <th className="text-right font-medium py-2">Attempts</th>
                    <th className="text-right font-medium py-2">Interventions</th>
                    <th className="text-right font-medium py-2">Drop-off</th>
                  </tr>
                </thead>
                <tbody>
                  {a.steps.map((s) => (
                    <tr key={s.step_id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{s.title}</td>
                      <td className="py-2 text-right tabular-nums">{s.attempts}</td>
                      <td className="py-2 text-right tabular-nums">{s.confusion}</td>
                      <td className="py-2 text-right tabular-nums">
                        {s.dropoff > 0 ? <span className="text-vlabs-rose">{s.dropoff}</span> : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {students.data && students.data.length > 0 && (
            <Panel title="Students">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground border-b">
                    <tr>
                      <th className="text-left font-medium py-2">Student</th>
                      <th className="text-right font-medium py-2">Sessions</th>
                      <th className="text-right font-medium py-2">Completed</th>
                      <th className="text-right font-medium py-2">Avg deviations</th>
                      <th className="text-right font-medium py-2">Avg hints</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.data.map((s) => (
                      <tr key={s.student} className="border-b last:border-0">
                        <td className="py-2 font-mono text-xs">
                          {s.student}
                          {/* Flagged from the behavioural read, so the
                              instructor does not have to cross-reference the
                              panel above against this table by hand. */}
                          {s.strained && (
                            <span
                              className="ml-2 px-1.5 py-0.5 rounded bg-vlabs-amber/20 text-vlabs-amber text-[10px] font-sans font-semibold align-middle"
                              title="The behavioural read flagged this student's session as hard going"
                            >
                              worth a look
                            </span>
                          )}
                        </td>
                        <td className="py-2 text-right tabular-nums">{s.sessions}</td>
                        <td className="py-2 text-right tabular-nums">{s.completed}</td>
                        <td className="py-2 text-right tabular-nums">{s.avg_deviations}</td>
                        <td className="py-2 text-right tabular-nums">{s.avg_hints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
