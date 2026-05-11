import { createFileRoute } from "@tanstack/react-router";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { Banner } from "./about";

export const Route = createFileRoute("/partners")({
  head: () => ({ meta: [{ title: "Participating Institutes — Virtual Labs" }] }),
  component: () => (
    <PageLayout>
      <Banner title="Participating Institutes" />
      <div className="max-w-6xl mx-auto px-4 py-10 grid md:grid-cols-4 gap-4">
        {["IIT Delhi", "IIT Bombay", "IIT Kharagpur", "IIT Kanpur", "IIT Madras", "IIT Guwahati", "IIT Roorkee", "IIIT Hyderabad", "NITK Surathkal", "COEP Pune", "AMU Aligarh", "Dayalbagh Educational Institute"].map(n => (
          <div key={n} className="bg-white border rounded p-4 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-vlabs-blue text-white grid place-items-center font-bold mb-2">{n.split(" ").map(w => w[0]).slice(0,2).join("")}</div>
            <div className="text-sm font-semibold">{n}</div>
          </div>
        ))}
      </div>
    </PageLayout>
  ),
});
