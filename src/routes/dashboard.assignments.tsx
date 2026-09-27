import { createFileRoute, Link } from "@tanstack/react-router";
import { ASSIGNMENTS } from "@/lib/mock-data";
export const Route = createFileRoute("/dashboard/assignments")({
  component: () => (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-vlabs-blue">My Assignments</h1>
      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs">
            <tr>
              <th className="text-left p-2">Lab</th>
              <th className="text-left p-2">Experiment</th>
              <th className="p-2">Due</th>
              <th className="p-2">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {ASSIGNMENTS.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="p-2">{a.lab}</td>
                <td className="p-2">{a.experiment}</td>
                <td className="p-2 text-center">{a.due}</td>
                <td className="p-2 text-center">
                  <span
                    className={`text-xs px-2 py-1 rounded ${a.status === "completed" ? "bg-green-100 text-green-700" : a.status === "due-soon" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}
                  >
                    {a.status}
                  </span>
                </td>
                <td className="p-2 text-right">
                  <Link
                    to="/labs/$labId/experiments/$expId"
                    params={{ labId: "psychological-process", expId: "colour-blindness" }}
                    className="vlabs-link text-xs"
                  >
                    Open →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),
});
