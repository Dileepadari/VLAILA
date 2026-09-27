import { createFileRoute } from "@tanstack/react-router";
import { NOTIFICATIONS } from "@/lib/mock-data";
export const Route = createFileRoute("/dashboard/notifications")({
  component: () => (
    <div>
      <h1 className="text-xl font-bold text-vlabs-blue mb-3">Notifications</h1>
      <div className="bg-white border rounded divide-y">
        {NOTIFICATIONS.map((n) => (
          <div
            key={n.id}
            className={`p-3 text-sm flex items-start gap-3 ${n.unread ? "bg-blue-50/40" : ""}`}
          >
            <span
              className={`mt-1 w-2 h-2 rounded-full ${n.unread ? "bg-vlabs-blue" : "bg-muted-foreground"}`}
            />
            <div className="flex-1">{n.text}</div>
            <span className="text-xs text-muted-foreground">{n.time}</span>
          </div>
        ))}
      </div>
    </div>
  ),
});
