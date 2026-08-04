import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Panel } from "@/components/console/primitives";
import { downloadReport, useNaturalLanguageQuery } from "@/lib/api";
import { Download, Loader2, Search } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/admin/query")({ component: NLQuery });

const EXAMPLES = [
  "Which experiments are most used?",
  "Which labs have the lowest completion rate?",
  "Compare sessions by institution",
  "How are interventions performing?",
  "Sessions by broad area",
];

function NLQuery() {
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const query = useNaturalLanguageQuery();
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setQuestion(text);
    setAsked(text);
    query.mutate(text);
  };

  const exportAs = async (fmt: "csv" | "pdf") => {
    setExporting(fmt);
    try {
      await downloadReport(asked, fmt);
    } finally {
      setExporting(null);
    }
  };

  const result = query.data;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-vlabs-blue">Ask the data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Plain-English questions about platform usage. Generated SQL is validated before it runs —
          read-only, single statement, and never a column that could identify an individual student.
        </p>
      </div>

      <Panel>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 border rounded-lg px-3 bg-muted/40 focus-within:ring-2 focus-within:ring-vlabs-cyan">
            <Search className="w-4 h-4 text-muted-foreground flex-none" />
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask(question)}
              placeholder="Ask anything about your platform…"
              className="flex-1 bg-transparent outline-none py-2.5 text-sm"
              aria-label="Ask a question about platform data"
            />
          </div>
          <button
            onClick={() => ask(question)}
            disabled={query.isPending || !question.trim()}
            className="bg-vlabs-blue text-white px-4 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
          >
            {query.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Ask
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => ask(ex)}
              className="text-xs border rounded-full px-3 py-1.5 text-muted-foreground hover:border-vlabs-cyan hover:text-vlabs-blue"
            >
              {ex}
            </button>
          ))}
        </div>
      </Panel>

      {query.isError && (
        <Panel>
          <p className="text-sm text-vlabs-rose">
            {query.error instanceof Error ? query.error.message : "The query failed."}
          </p>
        </Panel>
      )}

      {result && (
        <Panel
          title={asked}
          actions={
            result.columns.length > 0 && (
              <>
                <button
                  onClick={() => exportAs("csv")}
                  disabled={exporting !== null}
                  className="text-xs border rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-muted disabled:opacity-50"
                >
                  <Download className="w-3 h-3" /> CSV
                </button>
                <button
                  onClick={() => exportAs("pdf")}
                  disabled={exporting !== null}
                  className="text-xs border rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-muted disabled:opacity-50"
                >
                  <Download className="w-3 h-3" /> PDF
                </button>
              </>
            )
          }
        >
          <p className="text-sm mb-3">{result.answer}</p>

          {result.chart && (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={result.chart.data}>
                <XAxis
                  dataKey={result.chart.x}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) =>
                    String(v).length > 14 ? `${String(v).slice(0, 13)}…` : v
                  }
                />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar
                  dataKey={result.chart.y}
                  fill="var(--color-vlabs-cyan)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}

          {result.rows.length > 0 && (
            <div className="overflow-x-auto mt-3 border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    {result.columns.map((c) => (
                      <th key={c} className="text-left font-medium px-3 py-2 whitespace-nowrap">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-t">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-2 tabular-nums whitespace-nowrap">
                          {cell === null ? "—" : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.sql && (
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Show the SQL that ran
              </summary>
              <pre className="mt-2 text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                {result.sql}
              </pre>
            </details>
          )}
        </Panel>
      )}
    </div>
  );
}
