import { createFileRoute } from "@tanstack/react-router";
import { STUDENTS } from "@/lib/mock-data";
export const Route = createFileRoute("/faculty/students")({
  component: () => (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-vlabs-blue">Students</h1>
      <div className="bg-white border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted text-xs">
            <tr>
              <th className="text-left p-2">Roll</th>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Batch</th>
              <th className="p-2">Progress</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {STUDENTS.map((s) => (
              <tr key={s.roll} className="border-t">
                <td className="p-2 font-mono text-xs">{s.roll}</td>
                <td className="p-2">{s.name}</td>
                <td className="p-2 text-muted-foreground">{s.batch}</td>
                <td className="p-2 text-center">
                  {s.completed}/{s.assigned}
                </td>
                <td className="p-2 text-right">
                  <button className="text-xs vlabs-link">View profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ),
});
