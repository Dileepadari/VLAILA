import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
export const Route = createFileRoute("/admin/query")({
  component: () => {
    const [q, setQ] = useState(""); const [a, setA] = useState<string|null>(null);
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-vlabs-blue">Natural Language Query</h1>
        <div className="bg-white border rounded p-4">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Ask anything about your platform..." className="w-full border rounded px-3 py-2" />
          <button onClick={()=>setA("Top growing labs (30d): Stroop Effect (+22%), Colour Blindness (+18%), Ohm's Law (+11%). Total sessions: 1.2M.")} className="mt-2 bg-vlabs-blue text-white px-4 py-2 rounded">Ask</button>
        </div>
        {a && (
          <div className="bg-white border rounded p-4 text-sm space-y-3">
            <p>{a}</p>
            <div className="flex gap-2"><button className="border px-3 py-1.5 rounded text-xs">Export CSV</button><button className="border px-3 py-1.5 rounded text-xs">Export PDF</button></div>
          </div>
        )}
      </div>
    );
  },
});
