import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/faculty/classes")({
  component: () => (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-vlabs-blue">My Classes</h1>
      {[
        ["B.Tech CSE — 3rd yr — Section A", 32],
        ["B.Tech CSE — 3rd yr — Section B", 30],
        ["M.Tech CSE — 1st yr", 24],
      ].map(([n, c]) => (
        <div key={n as string} className="bg-white border rounded p-4 flex items-center justify-between">
          <div><div className="font-semibold">{n}</div><div className="text-xs text-muted-foreground">{c} students</div></div>
          <button className="text-xs vlabs-link">Open →</button>
        </div>
      ))}
    </div>
  ),
});
